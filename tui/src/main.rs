mod analyzer;
mod model;
mod pty;
mod theme;
mod ui;

use analyzer::Analyzer;
use anyhow::{Context, Result};
use base64::prelude::*;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use model::Snapshot;
use pty::{encode_key_for_pty, key_text_for_analyzer, HostedPty};
use ratatui::{backend::CrosstermBackend, layout::Rect, Terminal};
use std::{
    env,
    io::{self, IsTerminal, Read, Write},
    process::{Command, Stdio},
    sync::mpsc::{self, Receiver},
    thread,
    time::{Duration, Instant},
};
use ui::FocusPane;

enum RuntimeEvent {
    Pty(Vec<u8>),
    Snapshot(Snapshot),
}

fn main() -> Result<()> {
    let command: Vec<String> = env::args().skip(1).collect();
    if command.is_empty() {
        eprintln!("usage: prompt-sage-tui <cmd> [args...]");
        std::process::exit(2);
    }

    let no_ui = env::var("PROMPT_SAGE_NO_UI").ok().as_deref() == Some("1");
    if no_ui || !io::stdout().is_terminal() {
        return run_plain(&command);
    }

    run_tui(command)
}

fn run_tui(command: Vec<String>) -> Result<()> {
    let no_color = env::var_os("NO_COLOR").is_some();
    let mut stdout = io::stdout();
    enable_raw_mode().context("enable raw mode")?;
    execute!(stdout, EnterAlternateScreen).context("enter alternate screen")?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend).context("create terminal")?;
    terminal.clear().context("clear terminal")?;

    let result = run_event_loop(&mut terminal, command, no_color);

    disable_raw_mode().ok();
    execute!(terminal.backend_mut(), LeaveAlternateScreen).ok();
    terminal.show_cursor().ok();
    result
}

fn run_event_loop(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    command: Vec<String>,
    no_color: bool,
) -> Result<()> {
    let size = terminal.size().context("read terminal size")?;
    let layout = ui::app_layout(Rect {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
    });
    let (cols, rows) = parser_size(layout.cli_inner);
    let mut parser = vt100::Parser::new(rows, cols, 1000);

    let (tx, rx) = mpsc::channel::<RuntimeEvent>();
    let pty_tx = tx.clone();
    let snapshot_tx = tx.clone();
    let mut hosted = HostedPty::spawn(
        &command,
        cols,
        rows,
        mpsc_forward(pty_tx, RuntimeEvent::Pty),
    )
    .context("start hosted command")?;
    let mut analyzer = Analyzer::spawn(mpsc_forward(snapshot_tx, RuntimeEvent::Snapshot)).ok();

    let mut snapshot = Snapshot::default();
    let mut focus = FocusPane::Cli;
    let mut pulse_on = true;
    let mut last_pulse = Instant::now();
    let command_name = command.first().cloned().unwrap_or_else(|| "command".into());
    draw(
        terminal,
        &parser,
        &command_name,
        &snapshot,
        focus,
        pulse_on,
        no_color,
    )?;

    loop {
        let mut changed = drain_runtime_events(&rx, &mut parser, &mut analyzer, &mut snapshot)?;

        if event::poll(Duration::from_millis(50)).context("poll terminal event")? {
            match event::read().context("read terminal event")? {
                Event::Key(key) if key.kind == KeyEventKind::Press => {
                    if key.code == KeyCode::Char('q')
                        && key.modifiers.contains(KeyModifiers::CONTROL)
                    {
                        break;
                    }
                    if key.code == KeyCode::Char(']')
                        && key.modifiers.contains(KeyModifiers::CONTROL)
                    {
                        copy_osc52(terminal, &snapshot.optimized_prompt)?;
                        changed = true;
                    } else if key.code == KeyCode::Tab {
                        focus = if focus == FocusPane::Cli {
                            FocusPane::Sage
                        } else {
                            FocusPane::Cli
                        };
                        changed = true;
                    } else if key.code == KeyCode::Char('/') && focus == FocusPane::Sage {
                        changed = true;
                    } else if focus == FocusPane::Cli {
                        if let Some(text) = key_text_for_analyzer(key) {
                            if let Some(analyzer) = &mut analyzer {
                                let _ = analyzer.observe_input(&text);
                            }
                        }
                        if let Some(bytes) = encode_key_for_pty(key) {
                            hosted.write_all(&bytes)?;
                        }
                    }
                }
                Event::Resize(width, height) => {
                    let layout = ui::app_layout(Rect {
                        x: 0,
                        y: 0,
                        width,
                        height,
                    });
                    let (cols, rows) = parser_size(layout.cli_inner);
                    resize_parser(&mut parser, cols, rows);
                    hosted.resize(cols, rows)?;
                    changed = true;
                }
                _ => {}
            }
        }

        if last_pulse.elapsed() >= Duration::from_millis(500) {
            pulse_on = !pulse_on;
            last_pulse = Instant::now();
            changed = true;
        }

        if changed {
            draw(
                terminal,
                &parser,
                &command_name,
                &snapshot,
                focus,
                pulse_on,
                no_color,
            )?;
        }

        if hosted.try_wait()?.is_some() {
            break;
        }
    }

    hosted.kill();
    if let Some(analyzer) = &mut analyzer {
        analyzer.kill();
    }
    Ok(())
}

fn drain_runtime_events(
    rx: &Receiver<RuntimeEvent>,
    parser: &mut vt100::Parser,
    analyzer: &mut Option<Analyzer>,
    snapshot: &mut Snapshot,
) -> Result<bool> {
    let mut changed = false;
    while let Ok(event) = rx.try_recv() {
        match event {
            RuntimeEvent::Pty(bytes) => {
                parser.process(&bytes);
                if let Some(analyzer) = analyzer {
                    let text = String::from_utf8_lossy(&bytes);
                    let _ = analyzer.observe_output(&text);
                }
                changed = true;
            }
            RuntimeEvent::Snapshot(next) => {
                *snapshot = next;
                changed = true;
            }
        }
    }
    Ok(changed)
}

fn draw(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    parser: &vt100::Parser,
    command_name: &str,
    snapshot: &Snapshot,
    focus: FocusPane,
    pulse_on: bool,
    no_color: bool,
) -> Result<()> {
    terminal
        .draw(|frame| {
            ui::render_app(
                frame,
                parser.screen(),
                command_name,
                snapshot,
                focus,
                pulse_on,
                no_color,
            )
        })
        .context("draw tui")?;
    Ok(())
}

fn parser_size(area: Rect) -> (u16, u16) {
    (area.width.max(1), area.height.max(1))
}

fn resize_parser(parser: &mut vt100::Parser, cols: u16, rows: u16) {
    parser.set_size(rows, cols);
}

fn mpsc_forward<T: Send + 'static>(
    tx: mpsc::Sender<RuntimeEvent>,
    wrap: fn(T) -> RuntimeEvent,
) -> mpsc::Sender<T> {
    let (inner_tx, inner_rx) = mpsc::channel::<T>();
    thread::spawn(move || {
        while let Ok(value) = inner_rx.recv() {
            if tx.send(wrap(value)).is_err() {
                break;
            }
        }
    });
    inner_tx
}

fn copy_osc52(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>, text: &str) -> io::Result<()> {
    if text.is_empty() {
        return Ok(());
    }
    let payload = BASE64_STANDARD.encode(text.as_bytes());
    write!(terminal.backend_mut(), "\x1b]52;c;{}\x07", payload)?;
    terminal.backend_mut().flush()
}

fn run_plain(command: &[String]) -> Result<()> {
    let mut child = Command::new(&command[0])
        .args(&command[1..])
        .stdin(Stdio::inherit())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .with_context(|| format!("spawn {}", command[0]))?;

    let mut analyzer = Analyzer::spawn(mpsc_plain_snapshot()).ok();
    eprintln!("prompt-sage: TUI disabled; running hosted command with plain observation.");

    let mut stdout = child.stdout.take().context("open child stdout")?;
    let mut stderr = child.stderr.take().context("open child stderr")?;

    let out_handle = thread::spawn(move || copy_plain_stream(&mut stdout, true));
    let err_handle = thread::spawn(move || copy_plain_stream(&mut stderr, false));

    let status = child.wait().context("wait hosted command")?;
    let out = out_handle.join().unwrap_or_default();
    let err = err_handle.join().unwrap_or_default();
    if let Some(analyzer) = &mut analyzer {
        let _ = analyzer.observe_output(&out);
        let _ = analyzer.observe_output(&err);
        analyzer.kill();
    }

    std::process::exit(status.code().unwrap_or(1));
}

fn copy_plain_stream(reader: &mut dyn Read, is_stdout: bool) -> String {
    let mut collected = String::new();
    let mut buf = [0_u8; 8192];
    loop {
        match reader.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) => {
                let text = String::from_utf8_lossy(&buf[..n]);
                collected.push_str(&text);
                if is_stdout {
                    let _ = io::stdout().write_all(&buf[..n]);
                    let _ = io::stdout().flush();
                } else {
                    let _ = io::stderr().write_all(&buf[..n]);
                    let _ = io::stderr().flush();
                }
            }
        }
    }
    collected
}

fn mpsc_plain_snapshot() -> mpsc::Sender<Snapshot> {
    let (tx, rx) = mpsc::channel::<Snapshot>();
    thread::spawn(move || {
        while let Ok(snapshot) = rx.recv() {
            eprintln!(
                "prompt-sage: {} | {} | rewrite {}",
                fallback(&snapshot.trajectory, "Watching session."),
                snapshot.border.label(),
                format!("-{}% tokens", snapshot.savings_pct)
            );
        }
    });
    tx
}

fn fallback<'a>(value: &'a str, fallback: &'a str) -> &'a str {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback
    } else {
        trimmed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parser_size_uses_left_inner_rect() {
        let layout = ui::app_layout(Rect {
            x: 0,
            y: 0,
            width: 120,
            height: 40,
        });
        assert_eq!(parser_size(layout.cli_inner), (72, 38));
    }
}
