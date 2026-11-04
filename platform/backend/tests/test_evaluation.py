import time

import pytest

from app.evaluation import evaluate_code, validate_cases


def test_arithmetic_function_is_scored_against_supplied_cases():
    result = evaluate_code("def add(a, b):\n    return a + b", [{"args": [2, 3], "expected": 5}, {"args": [-5, 1], "expected": -4}, {"args": [0, 0], "expected": 8}])
    assert result["passed"] == 2
    assert result["total"] == 3
    assert result["score"] == 2 / 3


def test_loop_and_boolean_short_circuit_have_correct_semantics():
    code = "def total(n):\n    result = 0\n    for i in range(n):\n        result += i\n    return result"
    assert evaluate_code(code, [{"args": [10], "expected": 45}])["score"] == 1
    code = "def safe(n):\n    return n == 0 or 10 / n > 1"
    assert evaluate_code(code, [{"args": [0], "expected": True}])["score"] == 1


@pytest.mark.parametrize("code", [
    "def bad():\n    import os\n    return os.environ",
    "def bad():\n    return __import__('os')",
    "def bad():\n    while True:\n        pass",
    "def bad():\n    return 'x' * 1000000000000",
    "def bad():\n    return '%100000000000s' % ''",
    "def bad():\n    result = 0\n    for i in range(1000):\n        for j in range(1000):\n            result += 1\n    return result",
    "def bad():\n    return 999999 ** 999999",
    "def bad():\n    return open('/etc/passwd')",
])
def test_unsafe_or_unbounded_code_is_rejected_quickly(code):
    start = time.perf_counter()
    result = evaluate_code(code, [{"args": [], "expected": "unused"}])
    assert result["score"] == 0
    assert time.perf_counter() - start < 0.5


def test_test_inputs_are_bounded_and_require_expected_value():
    with pytest.raises(ValueError):
        validate_cases([{"args": [1]}])
    with pytest.raises(ValueError):
        validate_cases([{"args": [float("inf")], "expected": 1}])
    with pytest.raises(ValueError):
        validate_cases([{"args": [], "expected": 0}] * 26)
