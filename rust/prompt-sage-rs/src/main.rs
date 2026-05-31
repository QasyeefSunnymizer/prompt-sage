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
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
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

    let command_lower = command.to_lowercase();
    if command_lower == "run" || command_lower == "sidecar" {
        if cli.text.is_empty() {
            println!("{}", run_usage());
            return;
        }

        if std::env::var("PROMPT_SAGE_TEST_ROUTE").ok().as_deref() == Some("1") {
            println!("tui {}", cli.text.join(" "));
            return;
        }

        let Some(tui_bin) = ensure_tui_bin() else {
            eprintln!(
                "{}",
                error(
                    "Run requires the Rust TUI binary.",
                    Some("Automatic build could not locate or produce prompt-sage-tui.")
                )
            );
            std::process::exit(1);
        };
        let status = match Command::new(tui_bin).args(&cli.text).status() {
            Ok(status) => status,
            Err(err) => {
                eprintln!(
                    "{}",
                    error(&format!("Failed to launch Rust TUI: {}", err), None)
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

fn find_tui_bin() -> Option<std::path::PathBuf> {
    if let Ok(path) = std::env::var("PROMPT_SAGE_TUI_BIN") {
        let path = std::path::PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let cwd = std::env::current_dir().ok();
    let exe = if cfg!(windows) { ".exe" } else { "" };
    let bin_name = format!("prompt-sage-tui{}", exe);

    let mut candidates = Vec::new();
    if let Some(dir) = exe_dir {
        candidates.push(dir.join(&bin_name));
        candidates.push(
            dir.join("..")
                .join("..")
                .join("tui")
                .join("target")
                .join("release")
                .join(&bin_name),
        );
        candidates.push(
            dir.join("..")
                .join("..")
                .join("tui")
                .join("target")
                .join("debug")
                .join(&bin_name),
        );
    }
    if let Some(dir) = cwd {
        candidates.push(
            dir.join("tui")
                .join("target")
                .join("release")
                .join(&bin_name),
        );
        candidates.push(dir.join("tui").join("target").join("debug").join(&bin_name));
        candidates.push(dir.join("bin").join(&bin_name));
    }

    candidates.into_iter().find(|path| path.exists())
}

fn ensure_tui_bin() -> Option<std::path::PathBuf> {
    if let Some(path) = find_tui_bin() {
        return Some(path);
    }
    if std::env::var("PROMPT_SAGE_TUI_BIN").is_ok() {
        return None;
    }

    let manifest = find_tui_manifest()?;
    eprintln!(
        "prompt-sage: Rust TUI binary missing; running cargo build --release --manifest-path {}...",
        manifest.display()
    );
    let manifest_arg = manifest.to_string_lossy().to_string();
    let status = Command::new("cargo")
        .args(["build", "--release", "--manifest-path", &manifest_arg])
        .status()
        .ok()?;
    if !status.success() {
        return None;
    }
    find_tui_bin()
}

fn find_tui_manifest() -> Option<std::path::PathBuf> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let cwd = std::env::current_dir().ok();

    let mut candidates = Vec::new();
    if let Some(dir) = cwd {
        candidates.push(dir.join("tui").join("Cargo.toml"));
    }
    if let Some(dir) = exe_dir {
        candidates.push(dir.join("..").join("..").join("tui").join("Cargo.toml"));
    }

    candidates.into_iter().find(|path| path.exists())
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
        row("run", "prompt-sage run <claude|codex|command> [args...]"),
        row("update", "prompt-sage self-update [--dry-run]"),
        "".to_string(),
        label("Modes"),
        "  lite   gentle cleanup       full   default concise cadence".to_string(),
        "  ultra  shortest practical   master/roleplay explicit heavy style".to_string(),
    ]);
    lines.join("\n")
}

fn run_usage() -> String {
    let mut lines = header();
    lines.extend([
        "".to_string(),
        label("Run"),
        row("run", "prompt-sage run <claude|codex|command> [args...]"),
        row(
            "ui",
            "Ratatui PTY wrapper with Prompt Sage analysis docked right",
        ),
        row("debug", "PROMPT_SAGE_NO_UI=1 disables the wrapper"),
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
