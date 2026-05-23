use regex::Regex;

pub const LEVELS: [&str; 5] = ["lite", "full", "ultra", "master", "roleplay"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransformResult {
    pub mode_applied: String,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct SageState {
    pub active: bool,
    pub level: String,
}

impl Default for SageState {
    fn default() -> Self {
        Self {
            active: false,
            level: "full".to_string(),
        }
    }
}

pub fn parse_command(state: &mut SageState, input: &str) -> Result<String, String> {
    let raw = input.trim().to_lowercase();
    if raw == "stop sage" || raw == "normal mode" {
        state.active = false;
        return Ok("stop".to_string());
    }

    if !raw.starts_with("/sage") {
        return Ok("none".to_string());
    }

    let parts: Vec<&str> = raw.split_whitespace().collect();
    if parts.len() > 1 {
        let candidate = parts[1];
        if LEVELS.contains(&candidate) {
            state.level = candidate.to_string();
        } else {
            return Err(format!(
                "Unknown level '{}'. Use lite|full|ultra|master|roleplay.",
                candidate
            ));
        }
    }

    state.active = true;
    Ok("start".to_string())
}

pub fn transform_text(text: &str, level: &str) -> TransformResult {
    let level = if LEVELS.contains(&level) { level } else { "full" };
    if should_fallback_plain(text) {
        return TransformResult {
            mode_applied: "plain-safety".to_string(),
            text: strip_noise(text),
        };
    }

    if level == "lite" {
        return TransformResult {
            mode_applied: "lite".to_string(),
            text: strip_noise(text),
        };
    }

    let compact = compact_sentence(&strip_noise(text), level);
    let yoda = yoda_transform(&compact, level);
    TransformResult {
        mode_applied: level.to_string(),
        text: yoda,
    }
}

pub fn should_fallback_plain(text: &str) -> bool {
    let risky = Regex::new(r"(?i)\b(delete|drop table|truncate|rm -rf|destroy|irreversible|cannot be undone|wipe)\b")
        .expect("valid regex");
    let security = Regex::new(r"(?i)\b(security|credential|secret|token leak|exploit|vulnerability)\b")
        .expect("valid regex");
    risky.is_match(text) || security.is_match(text)
}

fn strip_noise(text: &str) -> String {
    let filler = Regex::new(r"(?i)\b(just|really|basically|actually|simply|very|maybe|perhaps)\b").unwrap();
    let pleasantry = Regex::new(r"(?i)\b(sure|certainly|of course|happy to|glad to)\b").unwrap();
    let hedging = Regex::new(r"(?i)\b(i think|it seems|likely|probably)\b").unwrap();

    let out = filler.replace_all(text, "");
    let out = pleasantry.replace_all(&out, "");
    let out = hedging.replace_all(&out, "");
    let whitespace = Regex::new(r"\s+").unwrap();
    whitespace.replace_all(out.trim(), " ").to_string()
}

fn compact_sentence(text: &str, level: &str) -> String {
    let out = text
        .replace("because", "for")
        .replace("Because", "for")
        .replace("therefore", "thus")
        .replace("Therefore", "thus");

    if matches!(level, "ultra" | "master" | "roleplay") {
        return out
            .replace("database", "DB")
            .replace("request", "req")
            .replace("response", "res")
            .replace("function", "fn")
            .replace("implementation", "impl");
    }
    out
}

fn yoda_transform(text: &str, level: &str) -> String {
    let copula =
        Regex::new(r"(?i)^(.+?)\s+(is|are|was|were|will|can|should|must)\s+(.+?)([.!?])?$").unwrap();
    if let Some(caps) = copula.captures(text) {
        let subject = caps.get(1).map(|m| m.as_str()).unwrap_or(text);
        let verb = caps.get(2).map(|m| m.as_str()).unwrap_or("");
        let predicate = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        let punct = caps.get(4).map(|m| m.as_str()).unwrap_or(".");
        let base = format!("{}, {} {}{}", predicate, subject, verb, punct);
        if matches!(level, "master" | "roleplay") {
            return format!("{} Hmm.", base.trim_end());
        }
        return base;
    }
    text.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_roleplay_level() {
        let mut state = SageState::default();
        let ty = parse_command(&mut state, "/sage roleplay").unwrap();
        assert_eq!(ty, "start");
        assert_eq!(state.level, "roleplay");
        assert!(state.active);
    }

    #[test]
    fn safety_fallback_still_triggers() {
        let out = transform_text("Delete users now.", "roleplay");
        assert_eq!(out.mode_applied, "plain-safety");
    }
}
