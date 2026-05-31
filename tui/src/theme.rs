use ratatui::style::{Color, Modifier, Style};

pub const BG: Color = Color::Rgb(0x11, 0x17, 0x14);
pub const RULE: Color = Color::Rgb(0x23, 0x30, 0x29);
pub const RULE_SOFT: Color = Color::Rgb(0x1b, 0x24, 0x1f);
pub const FG: Color = Color::Rgb(0xd4, 0xdc, 0xd5);
pub const FG_STRONG: Color = Color::Rgb(0xee, 0xf3, 0xee);
pub const MUTED: Color = Color::Rgb(0x6e, 0x80, 0x75);
pub const FAINT: Color = Color::Rgb(0x45, 0x50, 0x49);
pub const SAGE: Color = Color::Rgb(0x6f, 0xc6, 0x9a);
pub const CYAN: Color = Color::Rgb(0x5c, 0xc0, 0xd0);
pub const AMBER: Color = Color::Rgb(0xe0, 0xb1, 0x5a);
pub const CORAL: Color = Color::Rgb(0xe8, 0x78, 0x6b);
pub const VIOLET: Color = Color::Rgb(0x9b, 0x8f, 0xe0);
pub const FOCUS: Color = Color::Rgb(0xee, 0xf3, 0xee);

#[derive(Clone, Copy)]
pub struct Theme {
    no_color: bool,
}

impl Theme {
    pub fn new(no_color: bool) -> Self {
        Self { no_color }
    }

    pub fn fg(self, color: Color) -> Style {
        if self.no_color {
            Style::default()
        } else {
            Style::default().fg(color)
        }
    }

    pub fn bg(self, color: Color) -> Style {
        if self.no_color {
            Style::default()
        } else {
            Style::default().bg(color)
        }
    }

    pub fn fg_bg(self, fg: Color, bg: Color) -> Style {
        if self.no_color {
            Style::default()
        } else {
            Style::default().fg(fg).bg(bg)
        }
    }

    pub fn bold(self, color: Color) -> Style {
        self.fg(color).add_modifier(Modifier::BOLD)
    }

    pub fn fallback(self) -> Style {
        self.fg(MUTED).add_modifier(Modifier::ITALIC)
    }

    pub fn panel(self) -> Style {
        if self.no_color {
            Style::default()
        } else {
            Style::default().bg(BG).fg(FG)
        }
    }
}
