use crate::model::Snapshot;
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::{
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::mpsc::Sender,
    thread,
};

pub struct Analyzer {
    child: Child,
    stdin: ChildStdin,
}

impl Analyzer {
    pub fn spawn(tx: Sender<Snapshot>) -> Result<Self> {
        let root = find_project_root().context("locate prompt-sage source root")?;
        let analyzer = root.join("src").join("sidecar").join("analyzer.js");
        let bridge = root.join("src").join("sidecar").join("bridge-protocol.js");
        if !analyzer.exists() || !bridge.exists() {
            return Err(anyhow!(
                "missing sidecar analyzer files under {}",
                root.display()
            ));
        }

        let script = analyzer_script(&analyzer, &bridge)?;
        let mut child =
            Command::new(std::env::var("PROMPT_SAGE_NODE").unwrap_or_else(|_| "node".into()))
                .arg("-e")
                .arg(script)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
                .context("spawn analyzer")?;

        let stdout = child.stdout.take().context("open analyzer stdout")?;
        let stdin = child.stdin.take().context("open analyzer stdin")?;
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if line.trim().is_empty() {
                    continue;
                }
                if let Ok(snapshot) = serde_json::from_str::<Snapshot>(&line) {
                    if tx.send(snapshot).is_err() {
                        break;
                    }
                }
            }
        });

        Ok(Self { child, stdin })
    }

    pub fn observe_output(&mut self, text: &str) -> Result<()> {
        self.send("stdout", text)
    }

    pub fn observe_input(&mut self, text: &str) -> Result<()> {
        self.send("stdin", text)
    }

    fn send(&mut self, source: &str, data: &str) -> Result<()> {
        if data.is_empty() {
            return Ok(());
        }
        let frame = AnalyzerInput {
            r#type: "data",
            source,
            data,
        };
        serde_json::to_writer(&mut self.stdin, &frame).context("encode analyzer frame")?;
        self.stdin
            .write_all(b"\n")
            .context("write analyzer frame")?;
        self.stdin.flush().context("flush analyzer frame")
    }

    pub fn kill(&mut self) {
        let _ = self.child.kill();
    }
}

#[derive(Serialize)]
struct AnalyzerInput<'a> {
    r#type: &'a str,
    source: &'a str,
    data: &'a str,
}

fn analyzer_script(analyzer: &Path, bridge: &Path) -> Result<String> {
    let analyzer =
        serde_json::to_string(&analyzer.to_string_lossy()).context("quote analyzer path")?;
    let bridge = serde_json::to_string(&bridge.to_string_lossy()).context("quote bridge path")?;
    Ok(format!(
        r#"
const {{ ShadowMindAnalyzer }} = require({analyzer});
const {{ createLineDecoder }} = require({bridge});
const analyzer = new ShadowMindAnalyzer();
const decoder = createLineDecoder((frame) => {{
  const source = frame.source || (frame.type === "input" ? "stdin" : "stdout");
  const text = String(frame.data || frame.text || "");
  const snapshot = analyzer.observe(source, text);
  process.stdout.write(JSON.stringify({{ type: "snapshot", ...snapshot }}) + "\n");
}});
process.stdin.on("data", (chunk) => decoder.push(chunk));
process.stdin.on("end", () => decoder.flush());
"#
    ))
}

fn find_project_root() -> Option<PathBuf> {
    if let Ok(root) = std::env::var("PROMPT_SAGE_ROOT") {
        let path = PathBuf::from(root);
        if path
            .join("src")
            .join("sidecar")
            .join("analyzer.js")
            .exists()
        {
            return Some(path);
        }
    }

    let mut candidates = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."));
    if let Ok(exe) = std::env::current_exe() {
        for ancestor in exe.ancestors() {
            candidates.push(ancestor.to_path_buf());
        }
    }

    candidates
        .into_iter()
        .map(|path| path.canonicalize().unwrap_or(path))
        .find(|path| {
            path.join("src")
                .join("sidecar")
                .join("analyzer.js")
                .exists()
        })
}
