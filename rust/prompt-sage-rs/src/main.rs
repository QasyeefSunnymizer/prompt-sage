use clap::Parser;
use prompt_sage_rs::{parse_command, transform_text, SageState};

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
        // Phase-1 scaffold: command wiring only. Platform-specific updater lands next.
        if cli.dry_run {
            println!("self-update dry-run: platform updater wiring pending (phase 2)");
        } else {
            println!("self-update: platform updater wiring pending (phase 2)");
        }
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
