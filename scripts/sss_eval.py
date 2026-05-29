#!/usr/bin/env python3
"""Small deterministic evaluation helpers for Sunny's Smart Synth."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


SSS_DIR = Path("skills/sunnys-smart-synth")


STOPWORDS = {
    "about",
    "across",
    "actually",
    "after",
    "again",
    "against",
    "always",
    "answer",
    "before",
    "being",
    "catch",
    "change",
    "changes",
    "checks",
    "covers",
    "defines",
    "does",
    "evidence",
    "failure",
    "gives",
    "helps",
    "identifies",
    "ignores",
    "improve",
    "improvement",
    "issues",
    "judges",
    "mentions",
    "model",
    "models",
    "must",
    "only",
    "path",
    "pressure",
    "proposes",
    "quality",
    "requires",
    "scenario",
    "strategy",
    "should",
    "signal",
    "signals",
    "skill",
    "skills",
    "task",
    "tasks",
    "test",
    "tests",
    "that",
    "then",
    "this",
    "with",
    "without",
}

ALIASES = {
    "algorithmic": "algorithm",
    "benchmarks": "benchmark",
    "copies": "copy",
    "domains": "domain",
    "entries": "entry",
    "escalation": "escalate",
    "invariants": "invariant",
    "mitigation": "mitigate",
    "measurable": "benchmark",
    "measurement": "measure",
    "measuring": "measure",
    "optimizations": "optimization",
    "optimized": "optimize",
    "safety": "safe",
    "validation": "validate",
    "retrieved": "retrieval",
    "validates": "validate",
    "calibration": "calibrate",
    "completion": "complete",
    "coherence": "cohere",
    "deterministic": "determinism",
    "authorization": "authz",
    "authz": "authz",
    "authorisation": "authz",
    "authorized": "authz",
    "unauthorized": "authz",
    "credential": "secret",
    "credentials": "secret",
    "leakage": "leak",
    "ownership": "owner",
    "redaction": "redact",
    "rotation": "rotate",
    "rotating": "rotate",
    "representative": "production",
    "routing": "route",
    "tool": "tool",
    "tools": "tool",
    "traces": "trace",
}


def normalize_token(token: str) -> str:
    token = ALIASES.get(token, token)
    for suffix in ("ing", "ed", "es", "s"):
        if len(token) > len(suffix) + 3 and token.endswith(suffix):
            token = token[: -len(suffix)]
            break
    return ALIASES.get(token, token)


def tokens(text: str) -> set[str]:
    raw = re.findall(r"[a-z0-9]+", text.lower().replace("-", " "))
    return {normalize_token(t) for t in raw if len(t) > 2 and t not in STOPWORDS}


def criterion_hit(text_tokens: set[str], criterion: str) -> tuple[bool, set[str]]:
    wanted = tokens(criterion)
    if not wanted:
        return True, set()
    overlap = text_tokens & wanted
    threshold = 1 if len(wanted) <= 2 else 2
    return len(overlap) >= threshold, overlap


def anti_hit(text: str, text_tokens: set[str], anti: str) -> tuple[bool, set[str]]:
    anti_norm = " ".join(re.findall(r"[a-z0-9]+", anti.lower().replace("-", " ")))
    answer_norm = " ".join(re.findall(r"[a-z0-9]+", text.lower().replace("-", " ")))

    bad_phrases = []
    if "bit tricks" in anti_norm or "bit trick" in anti_norm:
        bad_phrases += ["bit tricks", "bit trick"]
    if "optimize everything" in anti_norm:
        bad_phrases += ["optimize everything", "optimize it all"]
    if "style only" in anti_norm:
        bad_phrases += ["style only", "only style"]
    if "single step" in anti_norm:
        bad_phrases += ["single step prod", "single step production"]
    if "exactly once" in anti_norm:
        bad_phrases += ["exactly once", "exactly once"]
    if "object graph" in anti_norm and "abstraction" in anti_norm:
        bad_phrases += ["pick object graph", "choose object graph for abstraction"]
    if "assembly inspection" in anti_norm:
        bad_phrases += ["recommend assembly inspection", "assembly inspection before measurement"]
    if "more memory" in anti_norm and "always better" in anti_norm:
        bad_phrases += ["more memory is always better", "memory is always better"]
    if "polish" in anti_norm and "only" in anti_norm:
        bad_phrases += ["polish only", "completeness only"]
    if "no way" in anti_norm:
        bad_phrases += ["no way to remove", "no way to repair"]

    for phrase in bad_phrases:
        phrase_norm = " ".join(re.findall(r"[a-z0-9]+", phrase.lower()))
        if phrase_norm in answer_norm:
            return True, set(phrase_norm.split())

    return False, set()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def score_item(item_id: str, text: str, expected: list[str], anti: list[str]) -> dict:
    text_tokens = tokens(text)
    expected_results = []
    anti_results = []

    for criterion in expected:
        hit, overlap = criterion_hit(text_tokens, criterion)
        expected_results.append(
            {"text": criterion, "hit": hit, "matched": sorted(overlap)}
        )

    for criterion in anti:
        hit, overlap = anti_hit(text, text_tokens, criterion)
        anti_results.append(
            {"text": criterion, "hit": hit, "matched": sorted(overlap)}
        )

    passed_expected = sum(1 for r in expected_results if r["hit"])
    anti_hits = sum(1 for r in anti_results if r["hit"])
    return {
        "id": item_id,
        "expected": expected_results,
        "anti": anti_results,
        "passed_expected": passed_expected,
        "total_expected": len(expected_results),
        "anti_hits": anti_hits,
        "pass": passed_expected == len(expected_results) and anti_hits == 0,
    }


def print_report(results: list[dict]) -> int:
    failures = 0
    for result in results:
        status = "PASS" if result["pass"] else "FAIL"
        print(
            f"{status} {result['id']}: "
            f"{result['passed_expected']}/{result['total_expected']} expected, "
            f"{result['anti_hits']} anti"
        )
        for row in result["expected"]:
            if not row["hit"]:
                failures += 1
                print(f"  missing: {row['text']}")
        for row in result["anti"]:
            if row["hit"]:
                failures += 1
                print(f"  anti-hit: {row['text']} [{', '.join(row['matched'])}]")

    total_pass = sum(1 for r in results if r["pass"])
    print(f"\nTOTAL: {total_pass}/{len(results)} passed")
    return 0 if failures == 0 else 1


def benchmark_command(args: argparse.Namespace) -> int:
    scenarios = load_json(args.scenarios)
    answers = load_json(args.answers)
    results = []

    for scenario in scenarios:
        scenario_id = scenario["id"]
        answer = answers.get(scenario_id, {}).get("response", "")
        if not answer:
            results.append(
                {
                    "id": scenario_id,
                    "expected": [],
                    "anti": [],
                    "passed_expected": 0,
                    "total_expected": len(scenario.get("criteria", [])),
                    "anti_hits": 0,
                    "pass": False,
                }
            )
            continue
        results.append(
            score_item(
                scenario_id,
                answer,
                scenario.get("criteria", []),
                scenario.get("anti", []),
            )
        )

    return print_report(results)


def extract_section(md: str, title: str) -> list[str]:
    pattern = re.compile(rf"^## {re.escape(title)}\s*$", re.MULTILINE)
    match = pattern.search(md)
    if not match:
        return []
    start = match.end()
    next_heading = re.search(r"^## ", md[start:], re.MULTILINE)
    end = start + next_heading.start() if next_heading else len(md)
    section = md[start:end]
    return [
        line[2:].strip()
        for line in section.splitlines()
        if line.startswith("- ") and line[2:].strip()
    ]


def pressure_command(args: argparse.Namespace) -> int:
    answers = load_json(args.answers)
    results = []

    for path in sorted(args.tests_dir.glob("test-pressure-*.md")):
        md = path.read_text(encoding="utf-8")
        answer = answers.get(path.stem, "")
        results.append(
            score_item(
                path.stem,
                answer,
                extract_section(md, "Expected Signals"),
                extract_section(md, "Failure Signals"),
            )
        )

    return print_report(results)


def candidate_pressure_command(args: argparse.Namespace) -> int:
    results = []

    for candidate_dir in sorted(args.candidates_dir.iterdir()):
        if not candidate_dir.is_dir():
            continue
        answers_path = candidate_dir / "benchmarks" / "pressure-golden-answers.json"
        tests_dir = candidate_dir / "tests"
        if not answers_path.exists() or not tests_dir.exists():
            results.append(
                {
                    "id": candidate_dir.name,
                    "expected": [],
                    "anti": [],
                    "passed_expected": 0,
                    "total_expected": 1,
                    "anti_hits": 0,
                    "pass": False,
                }
            )
            continue

        answers = load_json(answers_path)
        for path in sorted(tests_dir.glob("test-pressure-*.md")):
            md = path.read_text(encoding="utf-8")
            answer = answers.get(path.stem, "")
            results.append(
                score_item(
                    f"{candidate_dir.name}/{path.stem}",
                    answer,
                    extract_section(md, "Expected Signals"),
                    extract_section(md, "Failure Signals"),
                )
            )

    return print_report(results)


def candidate_benchmark_command(args: argparse.Namespace) -> int:
    results = []

    shared_answers = load_json(args.answers) if args.answers else None
    for candidate_dir in sorted(args.candidates_dir.iterdir()):
        if not candidate_dir.is_dir():
            continue
        scenarios_path = candidate_dir / "benchmarks" / "scenarios.json"
        answers_path = candidate_dir / "benchmarks" / "answers.json"
        if not scenarios_path.exists() or not (shared_answers is not None or answers_path.exists()):
            results.append(
                {
                    "id": candidate_dir.name,
                    "expected": [],
                    "anti": [],
                    "passed_expected": 0,
                    "total_expected": 1,
                    "anti_hits": 0,
                    "pass": False,
                }
            )
            continue

        scenarios = load_json(scenarios_path)
        answers = shared_answers if shared_answers is not None else load_json(answers_path)
        for scenario in scenarios:
            scenario_id = scenario["id"]
            raw = answers.get(scenario_id, "")
            answer = raw.get("response", "") if isinstance(raw, dict) else raw
            results.append(
                score_item(
                    f"{candidate_dir.name}/{scenario_id}",
                    answer,
                    scenario.get("criteria", []),
                    scenario.get("anti", []),
                )
            )

    return print_report(results)


def candidate_audit_command(args: argparse.Namespace) -> int:
    required_files = [
        "SKILL.md",
        "source-manifest.md",
        "extraction-notes.md",
        "primary-sources.md",
        "tests",
        "benchmarks/pressure-golden-answers.json",
        "benchmarks/scenarios.json",
        "benchmarks/answers.json",
    ]
    failed = False

    for candidate_dir in sorted(args.candidates_dir.iterdir()):
        if not candidate_dir.is_dir():
            continue
        missing = []
        for rel in required_files:
            path = candidate_dir / rel
            if not path.exists():
                missing.append(rel)
        test_count = len(list((candidate_dir / "tests").glob("test-pressure-*.md")))
        if test_count < args.min_pressure_tests:
            missing.append(f"{args.min_pressure_tests} pressure tests")

        if missing:
            failed = True
            print(f"FAIL {candidate_dir.name}: missing {', '.join(missing)}")
        else:
            print(f"PASS {candidate_dir.name}: structure ready ({test_count} pressure tests)")

    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    benchmark = subparsers.add_parser("benchmark")
    benchmark.add_argument(
        "--scenarios",
        type=Path,
        default=SSS_DIR / "benchmarks" / "phase2-scenarios.json",
    )
    benchmark.add_argument(
        "--answers",
        type=Path,
        default=SSS_DIR / "benchmarks" / "answers_sss_enhanced.json",
    )
    benchmark.set_defaults(func=benchmark_command)

    pressure = subparsers.add_parser("pressure")
    pressure.add_argument("--tests-dir", type=Path, default=SSS_DIR / "tests")
    pressure.add_argument(
        "--answers",
        type=Path,
        default=SSS_DIR / "benchmarks" / "pressure-golden-answers.json",
    )
    pressure.set_defaults(func=pressure_command)

    candidate_pressure = subparsers.add_parser("candidate-pressure")
    candidate_pressure.add_argument(
        "--candidates-dir", type=Path, default=Path("skill-candidates")
    )
    candidate_pressure.set_defaults(func=candidate_pressure_command)

    candidate_benchmark = subparsers.add_parser("candidate-benchmark")
    candidate_benchmark.add_argument(
        "--candidates-dir", type=Path, default=Path("skill-candidates")
    )
    candidate_benchmark.add_argument(
        "--answers",
        type=Path,
        default=None,
        help="Optional shared live-output JSON keyed by scenario id.",
    )
    candidate_benchmark.set_defaults(func=candidate_benchmark_command)

    candidate_audit = subparsers.add_parser("candidate-audit")
    candidate_audit.add_argument(
        "--candidates-dir", type=Path, default=Path("skill-candidates")
    )
    candidate_audit.add_argument("--min-pressure-tests", type=int, default=3)
    candidate_audit.set_defaults(func=candidate_audit_command)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
