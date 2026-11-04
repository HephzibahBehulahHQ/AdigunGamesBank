"""Independent JS curriculum / restricted Python evaluator contract check.

These are authored test oracles, never provider output or live-play evidence.
"""
import json
import subprocess
from pathlib import Path

from app.evaluation import evaluate_code


def test_all_10000_campaign_oracles_pass_the_real_backend_evaluator():
    root = Path(__file__).resolve().parents[3]
    script = """
      import {createChallenge, referencePython} from './game22/campaign.js';
      const rows = Array.from({length:10000}, (_, i) => {
        const level = i + 1, challenge = createChallenge(level);
        return {level, source:referencePython(level), cases:challenge.tests};
      });
      process.stdout.write(JSON.stringify(rows));
    """
    exported = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=root, capture_output=True, text=True, check=True, timeout=60,
    )
    rows = json.loads(exported.stdout)
    assert len(rows) == 10000
    for row in rows:
        outcome = evaluate_code(row["source"], row["cases"])
        assert outcome["score"] == 1.0, (
            f"Level {row['level']} disagrees with the real evaluator: {outcome}"
        )
