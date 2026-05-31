use crate::model::{Border as Severity, InsightLevel, Snapshot};
use crate::theme::{
    Theme, AMBER, BG, CORAL, CYAN, FAINT, FG, FG_STRONG, FOCUS, MUTED, RULE, RULE_SOFT, SAGE,
    VIOLET,
};
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Margin, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Gauge, Paragraph, Wrap},
    Frame,
};
use tui_term::widget::PseudoTerminal;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FocusPane {
    Cli,
    Sage,
}

pub fn render_app(
    frame: &mut Frame<'_>,
    screen: &vt100::Screen,
    command_name: &str,
    snapshot: &Snapshot,
    focus: FocusPane,
    pulse_on: bool,
    no_color: bool,
) {
    let area = frame.area();
    let layout = app_layout(area);
    render_cli(frame, layout.cli, screen, command_name, focus, no_color);
    if let Some(panel) = layout.panel {
        render_panel(frame, panel, snapshot, focus, pulse_on, no_color);
    } else {
        render_narrow_keybar(frame, area, no_color);
    }
}

pub struct AppLayout {
    pub cli: Rect,
    pub cli_inner: Rect,
    pub panel: Option<Rect>,
}

pub fn app_layout(area: Rect) -> AppLayout {
    if area.width < 80 {
        let cli = area;
        return AppLayout {
            cli,
            cli_inner: inner_rect(cli),
            panel: None,
        };
    }
    let panel_width = if area.width >= 120 {
        46
    } else if area.width >= 86 {
        42
    } else {
        40
    };
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(40), Constraint::Length(panel_width)])
        .split(area);
    AppLayout {
        cli: chunks[0],
        cli_inner: inner_rect(chunks[0]),
        panel: Some(chunks[1]),
    }
}

fn inner_rect(area: Rect) -> Rect {
    area.inner(Margin {
        horizontal: 1,
        vertical: 1,
    })
}

fn render_cli(
    frame: &mut Frame<'_>,
    area: Rect,
    screen: &vt100::Screen,
    command_name: &str,
    focus: FocusPane,
    no_color: bool,
) {
    let theme = Theme::new(no_color);
    let block = Block::default()
        .title(format!(" {} ", command_name))
        .borders(Borders::ALL)
        .border_style(theme.fg(if focus == FocusPane::Cli { FOCUS } else { RULE }));
    let inner = block.inner(area);
    frame.render_widget(block, area);
    frame.render_widget(PseudoTerminal::new(screen), inner);
}

fn render_narrow_keybar(frame: &mut Frame<'_>, area: Rect, no_color: bool) {
    if area.height == 0 {
        return;
    }
    let theme = Theme::new(no_color);
    let bar = Rect {
        y: area.y + area.height.saturating_sub(1),
        height: 1,
        ..area
    };
    let line = Line::from(vec![
        key("Ctrl+]", theme),
        Span::styled(" copy  ", theme.fg(MUTED)),
        key("Tab", theme),
        Span::styled(" focus  ", theme.fg(MUTED)),
        key("Ctrl+q", theme),
        Span::styled(" quit", theme.fg(MUTED)),
    ]);
    frame.render_widget(
        Paragraph::new(line)
            .style(theme.panel())
            .alignment(Alignment::Center),
        bar,
    );
}

fn render_panel(
    frame: &mut Frame<'_>,
    area: Rect,
    snapshot: &Snapshot,
    focus: FocusPane,
    pulse_on: bool,
    no_color: bool,
) {
    let theme = Theme::new(no_color);
    let border_color = if focus == FocusPane::Sage {
        FOCUS
    } else {
        severity_color(snapshot.border)
    };
    let outer = Block::default()
        .title(" prompt-sage ")
        .borders(Borders::ALL)
        .style(theme.panel())
        .border_style(theme.fg(border_color));
    frame.render_widget(outer, area);
    let inner = inner_rect(area);
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2),
            Constraint::Length(4),
            Constraint::Min(6),
            Constraint::Min(7),
            Constraint::Length(4),
            Constraint::Length(2),
        ])
        .split(inner);

    render_header(frame, chunks[0], snapshot, pulse_on, theme);
    render_trajectory(frame, chunks[1], snapshot, theme);
    render_insight(frame, chunks[2], snapshot, theme);
    render_rewrite(frame, chunks[3], snapshot, theme);
    render_context(frame, chunks[4], snapshot, theme);
    render_footer(frame, chunks[5], theme);
}

fn render_header(
    frame: &mut Frame<'_>,
    area: Rect,
    snapshot: &Snapshot,
    pulse_on: bool,
    theme: Theme,
) {
    let dot_color = if matches!(snapshot.border, Severity::Normal) || pulse_on {
        severity_color(snapshot.border)
    } else {
        FAINT
    };
    let status = Line::from(vec![
        Span::styled("* ", theme.fg(dot_color)),
        Span::styled(
            snapshot.border.label(),
            theme.fg(severity_color(snapshot.border)),
        ),
    ]);
    let layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(20), Constraint::Length(18)])
        .split(area);
    let title = Line::from(vec![
        Span::styled("prompt-sage", theme.bold(FG_STRONG)),
        Span::raw("  "),
        Span::styled("token-efficient agent comms", theme.fg(MUTED)),
    ]);
    frame.render_widget(Paragraph::new(title).style(theme.panel()), layout[0]);
    frame.render_widget(
        Paragraph::new(status)
            .style(theme.bg(BG))
            .alignment(Alignment::Right),
        layout[1],
    );
}

fn render_trajectory(frame: &mut Frame<'_>, area: Rect, snapshot: &Snapshot, theme: Theme) {
    let trajectory = non_empty(&snapshot.trajectory, "Watching session.");
    let chips = vec![
        chip(infer_model(&snapshot.trajectory), theme),
        Span::raw(" "),
        chip(infer_cwd(&snapshot.trajectory), theme),
        Span::raw(" "),
        chip(infer_event_type(snapshot), theme),
    ];
    let text = Text::from(vec![
        label(">", "TRAJECTORY", theme),
        Line::from(vec![
            Span::styled("> ", theme.fg(SAGE)),
            Span::styled(trajectory, theme.fg(FG)),
        ]),
        Line::from(chips),
    ]);
    frame.render_widget(
        Paragraph::new(text)
            .style(theme.panel())
            .wrap(Wrap { trim: true }),
        area,
    );
}

fn render_insight(frame: &mut Frame<'_>, area: Rect, snapshot: &Snapshot, theme: Theme) {
    let label_area = Rect { height: 1, ..area };
    frame.render_widget(
        Paragraph::new(label("*", "INSIGHT", theme)).style(theme.panel()),
        label_area,
    );
    let body = Rect {
        y: area.y.saturating_add(1),
        height: area.height.saturating_sub(1),
        ..area
    };
    match &snapshot.insight {
        None => frame.render_widget(
            Paragraph::new("No high-signal intervention yet.")
                .style(theme.fallback())
                .wrap(Wrap { trim: true }),
            body,
        ),
        Some(insight) => {
            let color = insight_color(insight.level);
            let block = Block::default()
                .borders(Borders::LEFT)
                .border_style(theme.fg(color))
                .style(tinted(theme, color));
            let inner = block.inner(body);
            frame.render_widget(block, body);
            let content = Text::from(vec![
                Line::from(vec![
                    Span::styled(insight.level.badge(), theme.bold(color)),
                    Span::raw("  "),
                    Span::styled(
                        non_empty(&insight.title, "Untitled insight"),
                        theme.bold(FG_STRONG),
                    ),
                ]),
                Line::from(Span::styled(
                    non_empty(&insight.body, "No details."),
                    theme.fg(FG),
                )),
            ]);
            frame.render_widget(Paragraph::new(content).wrap(Wrap { trim: true }), inner);
        }
    }
}

fn render_rewrite(frame: &mut Frame<'_>, area: Rect, snapshot: &Snapshot, theme: Theme) {
    let label_layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(12), Constraint::Length(14)])
        .split(Rect { height: 1, ..area });
    frame.render_widget(
        Paragraph::new(label("~", "REWRITE", theme)).style(theme.panel()),
        label_layout[0],
    );
    frame.render_widget(
        Paragraph::new("Ctrl+]  copy")
            .style(theme.fg(MUTED))
            .alignment(Alignment::Right),
        label_layout[1],
    );

    let body = Rect {
        y: area.y.saturating_add(1),
        height: area.height.saturating_sub(1),
        ..area
    };
    if snapshot.optimized_prompt.trim().is_empty() {
        frame.render_widget(
            Paragraph::new("No rewrite candidate.")
                .style(theme.fallback())
                .wrap(Wrap { trim: true }),
            body,
        );
        return;
    }

    let sections = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(3), Constraint::Length(1)])
        .split(body);
    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(theme.fg(VIOLET))
        .style(tinted(theme, VIOLET));
    let inner = block.inner(sections[0]);
    frame.render_widget(block, sections[0]);
    frame.render_widget(
        Paragraph::new(snapshot.optimized_prompt.as_str())
            .style(theme.fg(FG))
            .wrap(Wrap { trim: true }),
        inner,
    );
    let ratio = (snapshot.savings_pct.min(100) as f64) / 100.0;
    frame.render_widget(
        Gauge::default()
            .ratio(ratio)
            .label(format!("-{}% tokens", snapshot.savings_pct))
            .gauge_style(theme.fg(VIOLET).add_modifier(Modifier::BOLD)),
        sections[1],
    );
}

fn render_context(frame: &mut Frame<'_>, area: Rect, snapshot: &Snapshot, theme: Theme) {
    let label_layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(12), Constraint::Length(12)])
        .split(Rect { height: 1, ..area });
    frame.render_widget(
        Paragraph::new(label("+", "CONTEXT", theme)).style(theme.panel()),
        label_layout[0],
    );
    let body = Rect {
        y: area.y.saturating_add(1),
        height: area.height.saturating_sub(1),
        ..area
    };
    let files = parse_recent_files(&snapshot.notes);
    if files.is_empty() {
        frame.render_widget(
            Paragraph::new(non_empty(
                &snapshot.notes,
                "Observe-only. Copy suggestions; no command injection.",
            ))
            .style(theme.fg(MUTED))
            .wrap(Wrap { trim: true }),
            body,
        );
        return;
    }

    frame.render_widget(
        Paragraph::new(format!("{} files", files.len()))
            .style(theme.fg(MUTED))
            .alignment(Alignment::Right),
        label_layout[1],
    );
    let mut spans = Vec::new();
    for (idx, file) in files.iter().take(4).enumerate() {
        if idx > 0 {
            spans.push(Span::raw(" "));
        }
        spans.push(file_chip(file, theme));
    }
    frame.render_widget(
        Paragraph::new(Line::from(spans))
            .style(theme.panel())
            .wrap(Wrap { trim: true }),
        body,
    );
}

fn render_footer(frame: &mut Frame<'_>, area: Rect, theme: Theme) {
    let block = Block::default()
        .borders(Borders::TOP)
        .border_style(theme.fg(RULE));
    let inner = block.inner(area);
    frame.render_widget(block, area);
    let line = Line::from(vec![
        key("Ctrl+]", theme),
        Span::styled(" copy rewrite  ", theme.fg(MUTED)),
        key("Tab", theme),
        Span::styled(" focus pane  ", theme.fg(MUTED)),
        key("/", theme),
        Span::styled(" mode  ", theme.fg(MUTED)),
        key("Ctrl+q", theme),
        Span::styled(" quit", theme.fg(MUTED)),
    ]);
    frame.render_widget(Paragraph::new(line).style(theme.panel()), inner);
}

fn label(icon: &'static str, text: &'static str, theme: Theme) -> Line<'static> {
    Line::from(vec![
        Span::styled(icon, theme.fg(FAINT)),
        Span::raw(" "),
        Span::styled(text, theme.bold(MUTED)),
    ])
}

fn chip(text: String, theme: Theme) -> Span<'static> {
    Span::styled(format!(" {} ", text), theme.fg_bg(FAINT, RULE_SOFT))
}

fn file_chip(file: &str, theme: Theme) -> Span<'static> {
    let name = file
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or(file)
        .to_string();
    chip(name, theme)
}

fn key(text: &'static str, theme: Theme) -> Span<'static> {
    Span::styled(format!(" {} ", text), theme.fg_bg(FG_STRONG, RULE_SOFT))
}

fn non_empty<'a>(value: &'a str, fallback: &'a str) -> &'a str {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback
    } else {
        trimmed
    }
}

fn severity_color(border: Severity) -> Color {
    match border {
        Severity::Normal => SAGE,
        Severity::Warning => AMBER,
        Severity::Critical => CORAL,
    }
}

fn insight_color(level: InsightLevel) -> Color {
    match level {
        InsightLevel::Info => CYAN,
        InsightLevel::Warning => AMBER,
        InsightLevel::Critical => CORAL,
    }
}

fn tinted(theme: Theme, color: Color) -> Style {
    match color {
        Color::Rgb(r, g, b) => theme.bg(Color::Rgb(r / 8, g / 8, b / 8)).fg(FG),
        _ => theme.bg(BG).fg(FG),
    }
}

fn infer_event_type(snapshot: &Snapshot) -> String {
    if matches!(snapshot.border, Severity::Critical) {
        "risk".into()
    } else if snapshot.insight.is_some() {
        "signal".into()
    } else if !snapshot.optimized_prompt.trim().is_empty() {
        "rewrite".into()
    } else {
        "observe".into()
    }
}

fn infer_model(trajectory: &str) -> String {
    trajectory
        .split_whitespace()
        .find(|word| {
            word.starts_with("gpt-") || word.starts_with("claude-") || word.starts_with("codex")
        })
        .map(|word| {
            word.trim_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '.')
                .to_string()
        })
        .unwrap_or_else(|| "agent".into())
}

fn infer_cwd(trajectory: &str) -> String {
    let path = trajectory
        .split_whitespace()
        .find(|word| word.contains(":\\") || word.starts_with("~/") || word.starts_with('/'));
    let Some(path) = path else {
        return "cwd".into();
    };
    let cleaned = path
        .trim_matches(|c: char| c == '"' || c == '\'' || c == ',' || c == '.')
        .replace('\\', "/");
    let parts: Vec<_> = cleaned.split('/').filter(|part| !part.is_empty()).collect();
    if parts.len() > 2 {
        format!("~/{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
    } else {
        cleaned
    }
}

fn parse_recent_files(notes: &str) -> Vec<String> {
    notes
        .strip_prefix("Recent files:")
        .map(|rest| {
            rest.split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Border, Insight, Snapshot};
    use ratatui::{backend::TestBackend, Terminal};

    fn parser() -> vt100::Parser {
        let mut parser = vt100::Parser::new(24, 80, 0);
        parser.process(b"host line one\r\nhost line two");
        parser
    }

    fn render_to_string(width: u16, focus: FocusPane, snapshot: Snapshot) -> String {
        let backend = TestBackend::new(width, 30);
        let mut terminal = Terminal::new(backend).unwrap();
        let parser = parser();
        terminal
            .draw(|frame| {
                render_app(
                    frame,
                    parser.screen(),
                    "codex",
                    &snapshot,
                    focus,
                    true,
                    false,
                )
            })
            .unwrap();
        format!("{:?}", terminal.backend().buffer())
    }

    #[test]
    fn renders_fallback_regions() {
        let output = render_to_string(120, FocusPane::Cli, Snapshot::default());
        assert!(output.contains("Watching session."));
        assert!(output.contains("No high-signal intervention yet."));
        assert!(output.contains("No rewrite candidate."));
        assert!(output.contains("Observe-only."));
        assert!(output.contains("observing"));
    }

    #[test]
    fn renders_warning_and_critical_states() {
        let warning = render_to_string(
            120,
            FocusPane::Cli,
            Snapshot {
                trajectory: "Error in E:/Code/prompt-sage/src/sidecar/cli.mjs".into(),
                insight: Some(Insight {
                    level: InsightLevel::Warning,
                    title: "Loop Detected".into(),
                    body: "Same failure signature seen 2 times.".into(),
                }),
                optimized_prompt: "Task: fix tests. Run narrow verification.".into(),
                savings_pct: 25,
                notes: "Recent files: src/sidecar/cli.mjs, test/sidecar-bridge.test.js".into(),
                border: Border::Warning,
            },
        );
        assert!(warning.contains("intervening"));
        assert!(warning.contains("Loop Detected"));
        assert!(warning.contains("-25% tokens"));
        assert!(warning.contains("2 files"));

        let critical = render_to_string(
            120,
            FocusPane::Cli,
            Snapshot {
                trajectory: "rm -rf build".into(),
                insight: Some(Insight {
                    level: InsightLevel::Critical,
                    title: "Risky Command".into(),
                    body: "Destructive command pattern detected.".into(),
                }),
                border: Border::Critical,
                ..Snapshot::default()
            },
        );
        assert!(critical.contains("alert"));
        assert!(critical.contains("Risky Command"));
    }

    #[test]
    fn narrow_width_hides_panel_and_preserves_cli_width() {
        let layout = app_layout(Rect {
            x: 0,
            y: 0,
            width: 79,
            height: 24,
        });
        assert!(layout.panel.is_none());
        assert_eq!(layout.cli.width, 79);
        assert!(layout.cli_inner.width >= 40);
    }

    #[test]
    fn focused_pane_changes_rendered_buffer() {
        let cli = render_to_string(120, FocusPane::Cli, Snapshot::default());
        let sage = render_to_string(120, FocusPane::Sage, Snapshot::default());
        assert_ne!(cli, sage);
    }
}
