use anyhow::{anyhow, Context, Result};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::{
    ffi::OsString,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::mpsc::Sender,
    thread,
};

pub struct HostedPty {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

impl HostedPty {
    pub fn spawn(command: &[String], cols: u16, rows: u16, tx: Sender<Vec<u8>>) -> Result<Self> {
        let target = command
            .first()
            .ok_or_else(|| anyhow!("prompt-sage-tui requires a hosted command"))?;
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("open pty")?;

        let resolved = resolve_host_command(target, &command[1..]);
        let mut builder = CommandBuilder::new(&resolved.program);
        for arg in &resolved.args {
            builder.arg(arg);
        }
        builder.env(
            "TERM",
            std::env::var("TERM").unwrap_or_else(|_| "xterm-256color".into()),
        );

        let child = pair
            .slave
            .spawn_command(builder)
            .context("spawn hosted command")?;
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().context("clone pty reader")?;
        let writer = pair.master.take_writer().context("open pty writer")?;
        thread::spawn(move || {
            let mut buf = [0_u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if tx.send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                }
            }
        });

        Ok(Self {
            master: pair.master,
            writer,
            child,
        })
    }

    pub fn write_all(&mut self, bytes: &[u8]) -> Result<()> {
        self.writer.write_all(bytes).context("write to pty")?;
        self.writer.flush().context("flush pty")
    }

    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<()> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .context("resize pty")
    }

    pub fn kill(&mut self) {
        let _ = self.child.kill();
    }

    pub fn try_wait(&mut self) -> Result<Option<i32>> {
        match self.child.try_wait().context("wait hosted command")? {
            Some(status) => Ok(Some(status.exit_code() as i32)),
            None => Ok(None),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ResolvedCommand {
    pub(crate) program: OsString,
    pub(crate) args: Vec<OsString>,
}

pub(crate) fn resolve_host_command(target: &str, args: &[String]) -> ResolvedCommand {
    #[cfg(windows)]
    {
        resolve_windows_command(target, args)
    }
    #[cfg(not(windows))]
    {
        ResolvedCommand {
            program: OsString::from(target),
            args: args.iter().map(OsString::from).collect(),
        }
    }
}

#[cfg(windows)]
fn resolve_windows_command(target: &str, args: &[String]) -> ResolvedCommand {
    let runnable = if has_path_separator(target) {
        PathBuf::from(target)
    } else {
        find_windows_runnable(target).unwrap_or_else(|| PathBuf::from(target))
    };
    let ext = runnable
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if matches!(ext.as_str(), "cmd" | "bat") {
        let mut command_args = Vec::with_capacity(args.len() + 4);
        command_args.push(OsString::from("/d"));
        command_args.push(OsString::from("/s"));
        command_args.push(OsString::from("/c"));
        command_args.push(cmd_command_line(&runnable, args));
        return ResolvedCommand {
            program: OsString::from(std::env::var("ComSpec").unwrap_or_else(|_| "cmd.exe".into())),
            args: command_args,
        };
    }

    ResolvedCommand {
        program: runnable.into_os_string(),
        args: args.iter().map(OsString::from).collect(),
    }
}

#[cfg(windows)]
fn has_path_separator(target: &str) -> bool {
    target.contains('\\') || target.contains('/')
}

#[cfg(windows)]
fn find_windows_runnable(target: &str) -> Option<PathBuf> {
    let output = Command::new("where.exe")
        .arg(target)
        .output()
        .ok()
        .filter(|output| output.status.success())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    select_windows_runnable(
        stdout
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty()),
    )
}

#[cfg(windows)]
fn select_windows_runnable<'a>(matches: impl IntoIterator<Item = &'a str>) -> Option<PathBuf> {
    let paths: Vec<PathBuf> = matches.into_iter().map(PathBuf::from).collect();
    paths
        .iter()
        .find(|path| has_extension(path, "exe"))
        .cloned()
        .or_else(|| {
            paths
                .iter()
                .find(|path| has_extension(path, "cmd"))
                .cloned()
        })
        .or_else(|| {
            paths
                .iter()
                .find(|path| has_extension(path, "bat"))
                .cloned()
        })
        .or_else(|| {
            paths
                .iter()
                .find(|path| has_extension(path, "com"))
                .cloned()
        })
        .or_else(|| paths.first().cloned())
}

#[cfg(windows)]
fn has_extension(path: &Path, expected: &str) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case(expected))
        .unwrap_or(false)
}

#[cfg(windows)]
fn cmd_command_line(runnable: &Path, args: &[String]) -> OsString {
    let mut parts = Vec::with_capacity(args.len() + 1);
    parts.push(quote_for_cmd(&runnable.to_string_lossy()));
    parts.extend(args.iter().map(|arg| quote_for_cmd(arg)));
    OsString::from(parts.join(" "))
}

#[cfg(windows)]
fn quote_for_cmd(value: &str) -> String {
    if !value.is_empty()
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || "@%+=:,./\\-_".contains(ch))
    {
        value.to_string()
    } else {
        format!("\"{}\"", value.replace('"', "\\\""))
    }
}

pub fn encode_key_for_pty(key: KeyEvent) -> Option<Vec<u8>> {
    if is_reserved_key(key) {
        return None;
    }

    if key.modifiers.contains(KeyModifiers::CONTROL) {
        if let KeyCode::Char(ch) = key.code {
            return ctrl_char(ch).map(|byte| vec![byte]);
        }
    }

    match key.code {
        KeyCode::Char(ch) => Some(ch.to_string().into_bytes()),
        KeyCode::Enter => Some(b"\r".to_vec()),
        KeyCode::Backspace => Some(vec![0x7f]),
        KeyCode::Tab => Some(b"\t".to_vec()),
        KeyCode::Esc => Some(vec![0x1b]),
        KeyCode::Left => Some(b"\x1b[D".to_vec()),
        KeyCode::Right => Some(b"\x1b[C".to_vec()),
        KeyCode::Up => Some(b"\x1b[A".to_vec()),
        KeyCode::Down => Some(b"\x1b[B".to_vec()),
        KeyCode::Home => Some(b"\x1b[H".to_vec()),
        KeyCode::End => Some(b"\x1b[F".to_vec()),
        KeyCode::Delete => Some(b"\x1b[3~".to_vec()),
        _ => None,
    }
}

pub fn key_text_for_analyzer(key: KeyEvent) -> Option<String> {
    match key.code {
        KeyCode::Char(ch) if !key.modifiers.contains(KeyModifiers::CONTROL) => Some(ch.to_string()),
        KeyCode::Enter => Some("\n".into()),
        KeyCode::Backspace => Some("\u{8}".into()),
        _ => None,
    }
}

pub fn is_reserved_key(key: KeyEvent) -> bool {
    matches!(key.code, KeyCode::Tab)
        || matches!(key.code, KeyCode::Char('q') if key.modifiers.contains(KeyModifiers::CONTROL))
        || matches!(key.code, KeyCode::Char(']') if key.modifiers.contains(KeyModifiers::CONTROL))
}

fn ctrl_char(ch: char) -> Option<u8> {
    let upper = ch.to_ascii_uppercase();
    if upper.is_ascii_alphabetic() {
        Some((upper as u8) - b'A' + 1)
    } else if ch == '[' {
        Some(0x1b)
    } else if ch == '\\' {
        Some(0x1c)
    } else if ch == ']' {
        Some(0x1d)
    } else if ch == '^' {
        Some(0x1e)
    } else if ch == '_' {
        Some(0x1f)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossterm::event::KeyEvent;

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    fn ctrl(ch: char) -> KeyEvent {
        KeyEvent::new(KeyCode::Char(ch), KeyModifiers::CONTROL)
    }

    #[test]
    fn encodes_navigation_and_printable_keys() {
        assert_eq!(encode_key_for_pty(key(KeyCode::Enter)).unwrap(), b"\r");
        assert_eq!(encode_key_for_pty(key(KeyCode::Backspace)).unwrap(), [0x7f]);
        assert_eq!(encode_key_for_pty(key(KeyCode::Left)).unwrap(), b"\x1b[D");
        assert_eq!(encode_key_for_pty(key(KeyCode::Right)).unwrap(), b"\x1b[C");
        assert_eq!(encode_key_for_pty(key(KeyCode::Up)).unwrap(), b"\x1b[A");
        assert_eq!(encode_key_for_pty(key(KeyCode::Down)).unwrap(), b"\x1b[B");
        assert_eq!(encode_key_for_pty(key(KeyCode::Home)).unwrap(), b"\x1b[H");
        assert_eq!(encode_key_for_pty(key(KeyCode::End)).unwrap(), b"\x1b[F");
        assert_eq!(
            encode_key_for_pty(key(KeyCode::Delete)).unwrap(),
            b"\x1b[3~"
        );
        assert_eq!(encode_key_for_pty(key(KeyCode::Char('x'))).unwrap(), b"x");
    }

    #[test]
    fn encodes_ctrl_combos_and_blocks_reserved_hotkeys() {
        assert_eq!(encode_key_for_pty(ctrl('a')).unwrap(), [1]);
        assert_eq!(encode_key_for_pty(ctrl('c')).unwrap(), [3]);
        assert_eq!(encode_key_for_pty(ctrl('q')), None);
        assert_eq!(encode_key_for_pty(ctrl(']')), None);
        assert_eq!(encode_key_for_pty(key(KeyCode::Tab)), None);
    }

    #[cfg(windows)]
    #[test]
    fn windows_selects_runnable_npm_cmd_shim() {
        let selected = select_windows_runnable([
            "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex",
            "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex.cmd",
        ])
        .unwrap();
        assert_eq!(
            selected,
            PathBuf::from("C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex.cmd")
        );
    }

    #[cfg(windows)]
    #[test]
    fn windows_wraps_cmd_shims_with_comspec() {
        let resolved = resolve_windows_command(
            "C:\\Users\\qasye\\AppData\\Roaming\\npm\\codex.cmd",
            &["--version".into()],
        );
        assert!(resolved
            .program
            .to_string_lossy()
            .to_ascii_lowercase()
            .ends_with("cmd.exe"));
        assert_eq!(resolved.args[0], OsString::from("/d"));
        assert_eq!(resolved.args[1], OsString::from("/s"));
        assert_eq!(resolved.args[2], OsString::from("/c"));
        assert!(resolved.args[3].to_string_lossy().contains("codex.cmd"));
        assert!(resolved.args[3].to_string_lossy().contains("--version"));
    }
}
