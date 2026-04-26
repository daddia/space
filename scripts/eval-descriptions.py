#!/usr/bin/env python3
"""
Description eval loop for @tpw/skills.

Evaluates each skill's description by asking the Anthropic API to route a
representative set of queries against the full list of skill descriptions.
Reports a trigger_rate per skill and exits non-zero if any skill falls below
EVAL_THRESHOLD.

Usage:
    python scripts/eval-descriptions.py

Environment variables:
    ANTHROPIC_API_KEY  Required. Anthropic API key.
    EVAL_THRESHOLD     Optional. Minimum acceptable trigger_rate (default: 0.75).
    EVAL_MODEL         Optional. Anthropic model slug (default: claude-3-haiku-20240307).

Exit codes:
    0  All evaluated skills meet the threshold.
    1  One or more skills fell below the threshold, or a setup error occurred.

Output (stdout):
    One JSON object per line, one per evaluated skill:
    {"skill": "...", "trigger_rate": 0.93, "samples": 3, "threshold": 0.75, "pass": true}
"""

import json
import os
import pathlib
import sys

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = pathlib.Path(__file__).parent.parent
SKILLS_DIR = REPO_ROOT / "packages" / "skills"
QUERIES_PATH = REPO_ROOT / "scripts" / "eval-queries.json"

EVAL_THRESHOLD = float(os.environ.get("EVAL_THRESHOLD", "0.75"))
N_SAMPLES = 3
MODEL = os.environ.get("EVAL_MODEL", "claude-3-haiku-20240307")

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------

api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    sys.stderr.write("eval-descriptions: ANTHROPIC_API_KEY is not set\n")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    sys.stderr.write(
        "eval-descriptions: 'anthropic' package not found — install with: pip install anthropic\n"
    )
    sys.exit(1)

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "eval-descriptions: 'pyyaml' package not found — install with: pip install pyyaml\n"
    )
    sys.exit(1)

client = anthropic.Anthropic(api_key=api_key)

# ---------------------------------------------------------------------------
# Skill loading
# ---------------------------------------------------------------------------


def parse_frontmatter(content: str) -> dict:
    """Extract and parse the YAML frontmatter block from a Markdown file."""
    if not content.startswith("---\n"):
        return {}
    end = content.find("\n---", 4)
    if end == -1:
        return {}
    raw = content[4:end]
    try:
        return yaml.safe_load(raw) or {}
    except yaml.YAMLError:
        return {}


def load_skill_descriptions() -> dict[str, str]:
    """
    Walk packages/skills/*/SKILL.md and return {skill_name: description}
    for every skill that is not stage: deprecated.
    """
    descriptions: dict[str, str] = {}
    skip = {"bin", "views", "profiles"}

    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        if skill_dir.name.startswith(".") or skill_dir.name in skip:
            continue
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            continue

        fm = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        if fm.get("stage") == "deprecated":
            continue

        desc = fm.get("description", "")
        if isinstance(desc, str) and desc.strip():
            descriptions[skill_dir.name] = desc.strip()

    return descriptions


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------


def route_query(query: str, all_descriptions: dict[str, str]) -> str:
    """
    Ask the model to pick the best skill for the given query.
    Returns the lowercased, stripped skill name the model chose.
    """
    skills_list = "\n".join(
        f"- {name}: {desc}" for name, desc in sorted(all_descriptions.items())
    )
    prompt = (
        "You are a skill router. Given a list of skills and a user query, "
        "respond with ONLY the skill directory name that best matches — "
        "no explanation, no punctuation, just the exact name.\n\n"
        f"Skills:\n{skills_list}\n\n"
        f"Query: {query}\n\n"
        "Which single skill name best matches this query?"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=50,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip().lower()


def compute_trigger_rate(
    queries_for_skill: list[dict],
    all_descriptions: dict[str, str],
    expected_skill: str,
) -> float:
    """
    Run N_SAMPLES evaluations per query for this skill and return the
    fraction of calls that routed correctly.
    """
    total = len(queries_for_skill) * N_SAMPLES
    correct = 0

    for entry in queries_for_skill:
        query = entry["query"]
        for _ in range(N_SAMPLES):
            result = route_query(query, all_descriptions)
            if result == expected_skill.lower():
                correct += 1

    return correct / total if total > 0 else 0.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    descriptions = load_skill_descriptions()
    if not descriptions:
        sys.stderr.write("eval-descriptions: no stable skills found in packages/skills/\n")
        sys.exit(1)

    queries: list[dict] = json.loads(QUERIES_PATH.read_text(encoding="utf-8"))

    # Group queries by expected skill, skip queries for skills not in the package
    by_skill: dict[str, list[dict]] = {}
    for entry in queries:
        skill = entry["expected"]
        if skill not in descriptions:
            sys.stderr.write(
                f"eval-descriptions: warning — query expected skill '{skill}' "
                "not found in packages/skills/; skipping\n"
            )
            continue
        by_skill.setdefault(skill, []).append(entry)

    if not by_skill:
        sys.stderr.write("eval-descriptions: no evaluable queries after filtering\n")
        sys.exit(1)

    failed: list[dict] = []

    for skill_name in sorted(by_skill):
        queries_for_skill = by_skill[skill_name]
        trigger_rate = compute_trigger_rate(queries_for_skill, descriptions, skill_name)
        passed = trigger_rate >= EVAL_THRESHOLD

        result = {
            "skill": skill_name,
            "trigger_rate": round(trigger_rate, 3),
            "samples": N_SAMPLES,
            "threshold": EVAL_THRESHOLD,
            "pass": passed,
        }
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()

        if not passed:
            failed.append(result)

    if failed:
        for f in failed:
            sys.stderr.write(
                f"eval-descriptions: FAIL {f['skill']} "
                f"trigger_rate={f['trigger_rate']} threshold={f['threshold']}\n"
            )
        sys.exit(1)


if __name__ == "__main__":
    main()
