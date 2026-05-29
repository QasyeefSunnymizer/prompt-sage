use clap::Parser;
use prompt_sage_rs::{parse_command, self_update_plan_for, transform_text, SageState};
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
        print_usage();
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
                eprintln!("{}", err);
                std::process::exit(1);
            }
        };

        if cli.dry_run {
            println!(
                "Detected {}. Would run: {}",
                plan.manager,
                plan.commands.join(" && ")
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
                    eprintln!("Command failed with status {}: {}", s, cmd);
                    std::process::exit(1);
                }
                Err(e) => {
                    eprintln!("Failed to execute '{}': {}", cmd, e);
                    std::process::exit(1);
                }
            }
        }
        println!("prompt-sage updated via {}.", plan.manager);
        return;
    }

    if command.to_lowercase() == "sidecar" {
        if cli.text.is_empty() {
            println!("Usage: prompt-sage sidecar <claude|codex|command> [args...]");
            return;
        }

        let sidecar = find_sidecar_script();
        let status = match Command::new("bun").arg(sidecar).args(&cli.text).status() {
            Ok(status) => status,
            Err(err) => {
                eprintln!(
                    "prompt-sage sidecar requires Bun and the JS sidecar files: {}",
                    err
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
                let parsed = serde_json::json!({
                    "type": "none",
                    "active": state.active,
                    "level": state.level,
                });
                println!(
                    "{}",
                    serde_json::to_string_pretty(&parsed).expect("valid json")
                );
                return;
            }

            println!("{}", cli.text.join(" "));
        }
        Ok(kind) => {
            if cli.text.is_empty() {
                let parsed = serde_json::json!({
                    "type": kind,
                    "active": state.active,
                    "level": state.level,
                });
                println!(
                    "{}",
                    serde_json::to_string_pretty(&parsed).expect("valid json")
                );
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
            eprintln!("{}", err);
            std::process::exit(1);
        }
    }
}

fn print_usage() {
    println!("Usage:");
    println!("  prompt-sage \"/sage [lite|full|ultra|master|roleplay]\" \"text\"");
    println!("  prompt-sage sidecar <claude|codex|command> [args...]");
    println!("  prompt-sage self-update [--dry-run]");
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
