use std::process::Command;

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_prompt-sage"))
}

#[test]
fn prints_usage_without_args() {
    let output = bin().output().expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert!(stdout.contains("prompt-sage"));
    assert!(stdout.contains("Commands"));
    assert!(stdout.contains("Modes"));
    assert!(stdout.contains("run"));
    assert!(!stdout.contains("sidecar <"));
}

#[test]
fn prints_mode_status_without_text() {
    let output = bin().arg("/sage").output().expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert!(stdout.contains("Mode"));
    assert!(stdout.contains("state"));
    assert!(stdout.contains("active"));
    assert!(stdout.contains("level"));
    assert!(stdout.contains("full"));
    assert!(stdout.contains("event"));
    assert!(stdout.contains("start"));
}

#[test]
fn prints_run_usage_without_target() {
    let output = bin().arg("run").output().expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert!(stdout.contains("prompt-sage run <claude|codex|command>"));
}

#[test]
fn run_codex_routes_to_tui_runner() {
    let output = bin()
        .env("PROMPT_SAGE_TEST_ROUTE", "1")
        .args(["run", "codex"])
        .output()
        .expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert_eq!(stdout.trim(), "tui codex");
}

#[test]
fn sidecar_alias_still_routes_to_runner() {
    let output = bin()
        .env("PROMPT_SAGE_TEST_ROUTE", "1")
        .args(["sidecar", "codex"])
        .output()
        .expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert_eq!(stdout.trim(), "tui codex");
}

#[test]
fn transforms_input_text() {
    let output = bin()
        .args([
            "/sage",
            "Your auth middleware is too slow because it opens a new database connection for every request.",
        ])
        .output()
        .expect("cli should run");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert_eq!(
        stdout.trim(),
        "too slow for it opens a new database connection for every request, Your auth middleware is."
    );
}
