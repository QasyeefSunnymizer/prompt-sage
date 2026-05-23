use clap::Parser;
use prompt_sage_rs::{parse_command, self_update_plan_for, transform_text, SageState};
use std::process::Command;

#[derive(Parser, Debug)]
#[command(name = "prompt-sage-rs")]
#[command(about = "Rust scaffold for prompt-sage", long_about = None)]
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
            Command::new(cmd)
                .arg("--version")
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

    let mut state = SageState::default();
    match parse_command(&mut state, &command) {
        Ok(kind) if kind == "none" => {
            println!("{}", command);
        }
        Ok(_) => {
            if cli.text.is_empty() {
                println!(
                    "{{\"active\": {}, \"level\": \"{}\"}}",
                    state.active, state.level
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
    println!("  prompt-sage-rs \"/sage [lite|full|ultra|master|roleplay]\" \"text\"");
    println!("  prompt-sage-rs self-update [--dry-run]");
}
