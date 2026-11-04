"""A small, resource-bounded arithmetic language; never Python exec/eval."""

import ast
import math
import operator
import re

MAX_STEPS = 20_000
MAX_TESTS = 25
MAX_COLLECTION = 256
MAX_STRING = 4096
MAX_NUMBER = 10**12


class LimitExceeded(ValueError):
    pass


def checked(value, depth=0, budget=None):
    budget = [1024] if budget is None else budget
    budget[0] -= 1
    if budget[0] < 0:
        raise LimitExceeded("Value contains too many elements")
    if depth > 6:
        raise LimitExceeded("Value nesting exceeds the limit")
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        # Reject large integers before isfinite attempts an overflowing float conversion.
        if abs(value) > MAX_NUMBER or not math.isfinite(value):
            raise LimitExceeded("Number exceeds the limit")
        return value
    if isinstance(value, str) and len(value) <= MAX_STRING:
        return value
    if isinstance(value, (list, tuple)) and len(value) <= MAX_COLLECTION:
        return [checked(item, depth + 1, budget) for item in value]
    raise LimitExceeded("Unsupported or oversized value")


def validate_cases(cases):
    if not isinstance(cases, list) or not 1 <= len(cases) <= MAX_TESTS:
        raise ValueError("Provide 1 to 25 coding test cases")
    for case in cases:
        if not isinstance(case, dict) or set(case) != {"args", "expected"}:
            raise ValueError("Each test needs exactly args and expected")
        if not isinstance(case["args"], list) or len(case["args"]) > 10:
            raise ValueError("Each test permits at most 10 positional arguments")
        checked(case["args"])
        checked(case["expected"])


def evaluate_code(source, cases):
    """Bound AST size, aggregate operations, numeric growth and collection allocation."""
    total = len(cases)
    result = {"passed": 0, "total": total, "score": 0.0, "error": None}
    try:
        validate_cases(cases)
        if len(source) > 16_000:
            raise LimitExceeded("Code exceeds the 16,000-character limit")
        code = re.sub(r"^```(?:python)?\s*|\s*```$", "", source.strip(), flags=re.I)
        tree = ast.parse(code)
        if len(tree.body) != 1 or not isinstance(tree.body[0], ast.FunctionDef):
            raise ValueError("Return exactly one pure function")
        fn = tree.body[0]
        if fn.decorator_list or fn.args.vararg or fn.args.kwarg or fn.args.kwonlyargs or fn.args.defaults or fn.args.posonlyargs:
            raise ValueError("Use simple positional arguments without defaults")
        allowed = (
            ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.Return, ast.Assign,
            ast.AugAssign, ast.For, ast.If, ast.Expr, ast.Name, ast.Load, ast.Store,
            ast.Constant, ast.Tuple, ast.List, ast.BinOp, ast.UnaryOp, ast.Compare,
            ast.Call, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod,
            ast.Pow, ast.USub, ast.UAdd, ast.Not, ast.Eq, ast.NotEq, ast.Lt,
            ast.LtE, ast.Gt, ast.GtE, ast.IfExp, ast.BoolOp, ast.And, ast.Or,
        )
        nodes = list(ast.walk(tree))
        if len(nodes) > 400 or any(not isinstance(node, allowed) for node in nodes):
            raise ValueError("Unsupported syntax or oversized function")
        if any(isinstance(node, ast.Name) and node.id.startswith("__") for node in nodes):
            raise ValueError("Private names are not allowed")
        steps = MAX_STEPS
        operations = {
            ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
            ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod,
            ast.Pow: operator.pow, ast.Eq: operator.eq, ast.NotEq: operator.ne,
            ast.Lt: operator.lt, ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge,
        }

        def tick():
            nonlocal steps
            steps -= 1
            if steps < 0:
                raise LimitExceeded("Aggregate evaluation budget exceeded")

        def binary(op, left, right):
            checked(left)
            checked(right)
            if isinstance(op, ast.Pow):
                if not isinstance(left, (int, float)) or not isinstance(right, (int, float)) or abs(right) > 8 or abs(left) > 10**6:
                    raise LimitExceeded("Exponent exceeds the limit")
            if isinstance(op, ast.Mult):
                for collection, count in ((left, right), (right, left)):
                    if isinstance(collection, (str, list, tuple)) and isinstance(count, int):
                        limit = MAX_STRING if isinstance(collection, str) else MAX_COLLECTION
                        if len(collection) * max(count, 0) > limit:
                            raise LimitExceeded("Repeated collection exceeds the limit")
            # String interpolation can allocate enormous buffers; it is not arithmetic.
            if isinstance(op, ast.Mod) and isinstance(left, str):
                raise ValueError("String formatting is unsupported")
            return checked(operations[type(op)](left, right))

        def expression(node, env):
            tick()
            if isinstance(node, ast.Constant):
                return checked(node.value)
            if isinstance(node, ast.Name):
                return env[node.id]
            if isinstance(node, (ast.Tuple, ast.List)):
                return checked([expression(item, env) for item in node.elts])
            if isinstance(node, ast.BinOp):
                return binary(node.op, expression(node.left, env), expression(node.right, env))
            if isinstance(node, ast.UnaryOp):
                value = expression(node.operand, env)
                return checked(not value if isinstance(node.op, ast.Not) else -value if isinstance(node.op, ast.USub) else +value)
            if isinstance(node, ast.Compare):
                left = expression(node.left, env)
                for operation, other in zip(node.ops, node.comparators):
                    right = expression(other, env)
                    if not operations[type(operation)](left, right):
                        return False
                    left = right
                return True
            if isinstance(node, ast.BoolOp):
                # Preserve language short-circuit behavior and avoid needless work.
                value = expression(node.values[0], env)
                for other in node.values[1:]:
                    if isinstance(node.op, ast.And) and not value or isinstance(node.op, ast.Or) and value:
                        return value
                    value = expression(other, env)
                return value
            if isinstance(node, ast.IfExp):
                return expression(node.body if expression(node.test, env) else node.orelse, env)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
                args = [expression(arg, env) for arg in node.args]
                if node.func.id == "range":
                    if not 1 <= len(args) <= 3 or any(type(arg) is not int for arg in args):
                        raise ValueError("range requires integer arguments")
                    values = range(*args)
                    if len(values) > 1000:
                        raise LimitExceeded("Loop exceeds 1,000 iterations")
                    return values
                functions = {"abs": abs, "min": min, "max": max, "sum": sum, "len": len}
                if node.func.id in functions:
                    if any(isinstance(arg, range) for arg in args):
                        args = [checked(list(arg)) if isinstance(arg, range) else arg for arg in args]
                    return checked(functions[node.func.id](*args))
            raise ValueError("Unsupported expression")

        class Returned(Exception):
            def __init__(self, value):
                self.value = value

        def assign(target, value, env):
            tick()
            if isinstance(target, ast.Name):
                env[target.id] = checked(value)
            elif isinstance(target, (ast.Tuple, ast.List)) and len(target.elts) == len(value):
                for item, element in zip(target.elts, value):
                    assign(item, element, env)
            else:
                raise ValueError("Unsupported assignment")

        def block(statements, env):
            for statement in statements:
                tick()
                if isinstance(statement, ast.Return):
                    raise Returned(expression(statement.value, env) if statement.value else None)
                if isinstance(statement, ast.Assign):
                    value = expression(statement.value, env)
                    for target in statement.targets:
                        assign(target, value, env)
                elif isinstance(statement, ast.AugAssign):
                    assign(statement.target, binary(statement.op, expression(statement.target, env), expression(statement.value, env)), env)
                elif isinstance(statement, ast.If):
                    block(statement.body if expression(statement.test, env) else statement.orelse, env)
                elif isinstance(statement, ast.For):
                    values = expression(statement.iter, env)
                    if not isinstance(values, (list, tuple, str, range)):
                        raise ValueError("Unsupported loop input")
                    for value in values:
                        assign(statement.target, value, env)
                        block(statement.body, env)
                    block(statement.orelse, env)
                elif isinstance(statement, ast.Expr):
                    expression(statement.value, env)
                else:
                    raise ValueError("Unsupported statement")

        for case in cases:
            if len(case["args"]) != len(fn.args.args):
                continue
            env = dict(zip((arg.arg for arg in fn.args.args), checked(case["args"])))
            try:
                block(fn.body, env)
            except Returned as returned:
                if returned.value == checked(case["expected"]):
                    result["passed"] += 1
            except LimitExceeded:
                raise
            except (ValueError, TypeError, KeyError, ZeroDivisionError, OverflowError):
                pass
        result["score"] = result["passed"] / total
    except Exception:
        # No submitted code, secrets, stack traces or interpreter internals escape.
        result["error"] = "Unsupported function or evaluation limit exceeded; see the restricted-code rules."
        result["score"] = result["passed"] / total if total else 0.0
    return result
