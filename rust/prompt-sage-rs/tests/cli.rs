use std::process::Command;

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_prompt-sage"))
}

#[test]
fn prints_usage_without_args() {
    let output = bin().output().expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert!(stdout.contains("Usage:"));
    assert!(stdout.contains("prompt-sage"));
}

#[test]
fn prints_parse_result_without_text() {
    let output = bin().arg("/sage").output().expect("cli should run");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    assert!(stdout.contains("\"type\": \"start\""));
    assert!(stdout.contains("\"active\": true"));
    assert!(stdout.contains("\"level\": \"full\""));
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
