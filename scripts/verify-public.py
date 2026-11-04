"""Verify the published static runtime against one immutable Git revision.

This checks HTTP availability and exact bytes, not gameplay or live AI. Use the
separate CI browser receipt for those assertions. No credentials are read.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PAGES = "https://hephzibahbehulahhq.github.io/AdigunGamesBank/"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("commit", help="Exact 40-character candidate SHA")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--changed-since", help="Verify only changed public files after an already verified revision")
    args = parser.parse_args()
    for revision in (args.commit, args.changed_since):
        if revision is not None and not re.fullmatch(r"[0-9a-f]{40}", revision):
            parser.error("Use exact hexadecimal commit SHAs")
    if git("rev-parse", "HEAD").decode().strip() != args.commit:
        parser.error("Local HEAD does not match the candidate")

    retries = []

    def open_public(request):
        for attempt in range(2):
            try:
                return urllib.request.urlopen(request, timeout=30)
            except urllib.error.HTTPError as error:
                if attempt or error.code not in (502, 503, 504):
                    raise
                retries.append({"url": request.full_url, "httpStatus": error.code})
                time.sleep(2)

    with open_public(urllib.request.Request(PAGES, headers={"Cache-Control": "no-cache"})) as response:
        resolved = response.url
    paths = {"index.html", "data/games.json", "assets/catalog.css", "assets/catalog.js",
             "assets/corporate/hephzibah-behulah-official.jpg", "shared/tokens.css",
             "shared/game.css", "shared/three-stage.js", "shared/progression.js",
             "vendor/three/three.module.js"}
    catalog = json.loads(git("show", f"{args.commit}:data/games.json"))
    paths.update(game["path"] + "index.html" for game in catalog["games"])
    runtime_dirs = ("game3/", "game11/", "game15/", "game22/", "game23/")
    tree = git("ls-tree", "-r", "--name-only", args.commit).decode().splitlines()
    paths.update(path for path in tree if path.startswith(runtime_dirs) and Path(path).suffix in (".js", ".css"))
    if args.changed_since:
        paths = set(git("diff", "--name-only", "--diff-filter=AM", args.changed_since, args.commit).decode().splitlines())
    if not paths:
        parser.error("No files selected for public verification")
    started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

    def verify(path):
        expected = git("show", f"{args.commit}:{path}")
        url = urllib.parse.urljoin(resolved, urllib.parse.quote(path)) + "?verified_commit=" + args.commit
        request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
        wanted = hashlib.sha256(expected).hexdigest()
        try:
            with open_public(request) as response:
                body, status, final_url = response.read(len(expected) + 1), response.status, response.url
            actual = hashlib.sha256(body).hexdigest()
            return {"path": path, "url": final_url, "status": status, "bytes": len(body),
                    "sha256": actual, "expectedSha256": wanted, "matches": status == 200 and actual == wanted}
        except (urllib.error.URLError, TimeoutError) as error:
            return {"path": path, "url": url, "expectedSha256": wanted, "matches": False, "error": str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(verify, sorted(paths)))
    receipt = {"commit": args.commit, "requestedUrl": PAGES, "resolvedUrl": resolved,
               "startedAt": started, "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
               "transientRetries": retries, "verifiedFiles": len(results),
               "allMatch": all(item["matches"] for item in results), "files": results,
               "priorVerifiedCommit": args.changed_since,
               "scope": "Public HTTP availability and exact candidate bytes; no gameplay, hardware or live-AI claim."}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({key: receipt[key] for key in ("commit", "resolvedUrl", "completedAt", "verifiedFiles", "allMatch")}))
    for result in results:
        if not result["matches"]:
            print(json.dumps(result))
    return 0 if receipt["allMatch"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
