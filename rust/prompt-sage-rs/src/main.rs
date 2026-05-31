use clap::Parser;
use prompt_sage_rs::{parse_command, self_update_plan_for, transform_text, SageState};
use std::io::IsTerminal;
use std::process::Command;

#[derive(Parser, Debug)]
#[command(name = "prompt-sage")]
#[command(about = "Prompt Sage CLI", long_about = None)]
struct Cli {
    /// Mode command such as /sage, /sage roleplay, stop sage, self-update
    command: Option<String>,
    /// Input text to transform
    text: Vec<String>,
    /// Print detected update command only
    #[arg(long)]
    dry_run: bool,
}

fn main() {
    let cli = Cli::parse();

    if cli.command.is_none() {
        println!("{}", usage());
        return;
    }

    let command = cli.command.unwrap();
    if command.to_lowercase() == "self-update" {
        let platform = std::env::consts::OS;
        let has_cmd = |cmd: &str| {
            let probe_arg = if cmd == "choco" { "-v" } else { "--version" };
            Command::new(cmd)
                .arg(probe_arg)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        };
        let plan = match self_update_plan_for(platform, has_cmd) {
            Ok(p) => p,
            Err(err) => {
                eprintln!("{}", error(&err, None));
                std::process::exit(1);
            }
        };

        if cli.dry_run {
            println!(
                "{}",
                update_status(&plan.manager, &plan.commands.join(" && "), true)
            );
            return;
        }

        for cmd in &plan.commands {
            let status = if cfg!(target_os = "windows") {
                Command::new("cmd").args(["/C", cmd]).status()
            } else {
                Command::new("sh").args(["-lc", cmd]).status()
            };

            match status {
                Ok(s) if s.success() => {}
                Ok(s) => {
                    eprintln!(
                        "{}",
                        error(&format!("Command failed with status {}: {}", s, cmd), None)
                    );
                    std::process::exit(1);
                }
                Err(e) => {
                    eprintln!(
                        "{}",
                        error(&format!("Failed to execute '{}': {}", cmd, e), None)
                    );
                    std::process::exit(1);
                }
            }
        }
        println!("{}", update_status(&plan.manager, "complete", false));
        return;
    }

    if command.to_lowercase() == "sidecar" {
        if cli.text.is_empty() {
            println!("{}", sidecar_usage());
            return;
        }

        let sidecar = find_sidecar_script();
        let status = match Command::new("bun").arg(sidecar).args(&cli.text).status() {
            Ok(status) => status,
            Err(err) => {
                eprintln!(
                    "{}",
                    error(
                        &format!("Sidecar requires Bun and the JS sidecar files: {}", err),
                        None
                    )
                );
                std::process::exit(1);
            }
        };
        std::process::exit(status.code().unwrap_or(1));
    }

    let mut state = SageState::default();
    match parse_command(&mut state, &command) {
        Ok(kind) if kind == "none" => {
            if cli.text.is_empty() {
                println!("{}", parse_status("none", state.active, &state.level));
                return;
            }

            println!("{}", cli.text.join(" "));
        }
        Ok(kind) => {
            if cli.text.is_empty() {
                println!("{}", parse_status(&kind, state.active, &state.level));
                return;
            }
            let input = cli.text.join(" ");
            if !state.active {
                println!("{}", input);
                return;
            }
            let out = transform_text(&input, &state.level);
            println!("{}", out.text);
        }
        Err(err) => {
            eprintln!("{}", error(&err, None));
            std::process::exit(1);
        }
    }
}

fn find_sidecar_script() -> std::path::PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let cwd = std::env::current_dir().ok();

    let mut candidates = Vec::new();
    if let Some(dir) = exe_dir {
        candidates.push(dir.join("src").join("sidecar").join("cli.mjs"));
        candidates.push(dir.join("..").join("src").join("sidecar").join("cli.mjs"));
        candidates.push(
            dir.join("..")
                .join("..")
                .join("..")
                .join("..")
                .join("src")
                .join("sidecar")
                .join("cli.mjs"),
        );
    }
    if let Some(dir) = cwd {
        candidates.push(dir.join("src").join("sidecar").join("cli.mjs"));
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| std::path::PathBuf::from("src/sidecar/cli.mjs"))
}

const BRAND: &str = "prompt-sage";
const TAGLINE: &str = "token-efficient agent communication";
const LEVELS: &str = "lite | full | ultra | master | roleplay";

fn should_color_stdout() -> bool {
    std::io::stdout().is_terminal() && std::env::var("NO_COLOR").unwrap_or_default() != "1"
}

fn should_color_stderr() -> bool {
    std::io::stderr().is_terminal() && std::env::var("NO_COLOR").unwrap_or_default() != "1"
}

fn color_stdout(code: &str, text: &str) -> String {
    if should_color_stdout() {
        format!("\x1b[{}m{}\x1b[0m", code, text)
    } else {
        text.to_string()
    }
}

fn color_stderr(code: &str, text: &str) -> String {
    if should_color_stderr() {
        format!("\x1b[{}m{}\x1b[0m", code, text)
    } else {
        text.to_string()
    }
}

fn label(text: &str) -> String {
    color_stdout("36;1", text)
}

fn muted(text: &str) -> String {
    color_stdout("2", text)
}

fn success(text: &str) -> String {
    color_stdout("32;1", text)
}

fn header() -> Vec<String> {
    vec![
        format!("{} {}", label(BRAND), muted(TAGLINE)),
        muted(&"=".repeat(56)),
    ]
}

fn row(left: &str, right: &str) -> String {
    format!("  {} {}", label(&format!("{:<12}", left)), right)
}

fn usage() -> String {
    let mut lines = header();
    lines.extend([
        "".to_string(),
        label("Commands"),
        row(
            "transform",
            &format!("prompt-sage \"/sage [{}]\" \"text\"", LEVELS),
        ),
        row(
            "sidecar",
            "prompt-sage sidecar <claude|codex|command> [args...]",
        ),
        row("update", "prompt-sage self-update [--dry-run]"),
        "".to_string(),
        label("Modes"),
        "  lite   gentle cleanup       full   default concise cadence".to_string(),
        "  ultra  shortest practical   master/roleplay explicit heavy style".to_string(),
    ]);
    lines.join("\n")
}

fn sidecar_usage() -> String {
    let mut lines = header();
    lines.extend([
        "".to_string(),
        label("Sidecar"),
        row(
            "run",
            "prompt-sage sidecar <claude|codex|command> [args...]",
        ),
        row(
            "ui",
            "split PTY wrapper with Prompt Sage analysis docked right",
        ),
        row("debug", "PROMPT_SAGE_NO_UI=1 disables the split wrapper"),
    ]);
    lines.join("\n")
}

fn parse_status(kind: &str, active: bool, level: &str) -> String {
    let mut lines = header();
    let state = if active {
        success("active")
    } else {
        muted("inactive")
    };
    lines.extend([
        "".to_string(),
        label("Mode"),
        row("state", &state),
        row("level", level),
        row("event", kind),
    ]);
    lines.join("\n")
}

fn update_status(manager: &str, detail: &str, dry_run: bool) -> String {
    let mut lines = header();
    lines.extend([
        "".to_string(),
        label("Update"),
        row("manager", manager),
        row(if dry_run { "would run" } else { "status" }, detail),
    ]);
    lines.join("\n")
}

fn error(message: &str, hint: Option<&str>) -> String {
    let mut lines = vec![format!(
        "{} {}",
        color_stderr("33;1", "prompt-sage error"),
        message
    )];
    if let Some(hint) = hint {
        lines.push(color_stderr("2", &format!("hint: {}", hint)));
    }
    lines.join("\n")
}
