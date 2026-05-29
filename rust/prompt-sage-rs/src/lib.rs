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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelfUpdatePlan {
    pub manager: String,
    pub commands: Vec<String>,
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
    let safe_level = if LEVELS.contains(&level) {
        level
    } else {
        "full"
    };
    let effective_level = if safe_level == "master" {
        "roleplay"
    } else {
        safe_level
    };

    if should_fallback_plain(text) {
        return TransformResult {
            mode_applied: "plain-safety".to_string(),
            text: strip_noise(text),
        };
    }

    if effective_level == "lite" {
        return TransformResult {
            mode_applied: "lite".to_string(),
            text: strip_noise(text),
        };
    }

    let transformed = preserve_code_blocks(text, |chunk| {
        let plain = strip_noise(chunk);
        let pieces: Vec<String> = sentence_split(&plain)
            .iter()
            .map(|sentence| transform_sentence(sentence, effective_level))
            .collect();
        enforce_length_budget(&plain, &pieces.join(" "), effective_level)
    });
    TransformResult {
        mode_applied: safe_level.to_string(),
        text: transformed,
    }
}

pub fn self_update_plan_for(
    platform: &str,
    has_cmd: impl Fn(&str) -> bool,
) -> Result<SelfUpdatePlan, String> {
    if let Ok(forced) = std::env::var("PROMPT_SAGE_UPDATE_MANAGER") {
        let forced = forced.trim().to_lowercase();
        if !forced.is_empty() {
            return match forced.as_str() {
                "winget" | "choco" | "brew" | "apt" | "dnf" => {
                    self_update_plan_for_manager(&forced)
                }
                _ => Err(format!(
                    "Unsupported PROMPT_SAGE_UPDATE_MANAGER '{}'.",
                    forced
                )),
            };
        }
    }

    if platform == "windows" {
        if has_cmd("winget") {
            return self_update_plan_for_manager("winget");
        }
        if has_cmd("choco") {
            return self_update_plan_for_manager("choco");
        }
        return Err("No supported Windows package manager found (winget/choco).".to_string());
    }

    if platform == "macos" {
        if has_cmd("brew") {
            return self_update_plan_for_manager("brew");
        }
        return Err("Homebrew is required for self-update on macOS.".to_string());
    }

    if platform == "linux" {
        if has_cmd("apt") {
            return self_update_plan_for_manager("apt");
        }
        if has_cmd("dnf") {
            return self_update_plan_for_manager("dnf");
        }
        return Err("No supported Linux package manager found (apt/dnf).".to_string());
    }

    Err(format!("Unsupported platform '{}'.", platform))
}

fn self_update_plan_for_manager(manager: &str) -> Result<SelfUpdatePlan, String> {
    match manager {
        "winget" => Ok(SelfUpdatePlan {
            manager: "winget".to_string(),
            commands: vec!["winget upgrade prompt-sage".to_string()],
        }),
        "choco" => Ok(SelfUpdatePlan {
            manager: "choco".to_string(),
            commands: vec!["choco upgrade prompt-sage -y".to_string()],
        }),
        "brew" => Ok(SelfUpdatePlan {
            manager: "brew".to_string(),
            commands: vec![
                "brew update".to_string(),
                "brew upgrade prompt-sage".to_string(),
            ],
        }),
        "apt" => Ok(SelfUpdatePlan {
            manager: "apt".to_string(),
            commands: vec![
                "sudo apt update".to_string(),
                "sudo apt install --only-upgrade -y prompt-sage".to_string(),
            ],
        }),
        "dnf" => Ok(SelfUpdatePlan {
            manager: "dnf".to_string(),
            commands: vec!["sudo dnf upgrade -y prompt-sage".to_string()],
        }),
        _ => Err(format!("Unsupported manager '{}'.", manager)),
    }
}

pub fn should_fallback_plain(text: &str) -> bool {
    let risky = Regex::new(
        r"(?i)\b(delete|drop table|truncate|rm -rf|destroy|irreversible|cannot be undone|wipe)\b",
    )
    .expect("valid regex");
    let security =
        Regex::new(r"(?i)\b(security|credential|secret|token leak|exploit|vulnerability)\b")
            .expect("valid regex");
    risky.is_match(text) || security.is_match(text)
}

fn strip_noise(text: &str) -> String {
    let filler =
        Regex::new(r"(?i)\b(just|really|basically|actually|simply|very|maybe|perhaps)\b").unwrap();
    let pleasantry = Regex::new(r"(?i)\b(sure|certainly|of course|happy to|glad to)\b").unwrap();
    let hedging = Regex::new(r"(?i)\b(i think|it seems|likely|probably)\b").unwrap();

    let out = filler.replace_all(text, "");
    let out = pleasantry.replace_all(&out, "");
    let out = hedging.replace_all(&out, "");
    let whitespace = Regex::new(r"\s+").unwrap();
    whitespace.replace_all(out.trim(), " ").to_string()
}

fn compact_sentence(text: &str, level: &str) -> String {
    if level == "lite" {
        return text.to_string();
    }

    let out = text
        .replace("do not", "avoid")
        .replace("Do not", "avoid")
        .replace("don't", "avoid")
        .replace("Don't", "avoid")
        .replace("because", "for")
        .replace("Because", "for")
        .replace("therefore", "thus")
        .replace("Therefore", "thus");

    if matches!(level, "ultra" | "master" | "roleplay") {
        return out
            .replace("configuration", "config")
            .replace("Configuration", "config")
            .replace("database", "DB")
            .replace("Database", "DB")
            .replace("request", "req")
            .replace("Request", "req")
            .replace("response", "res")
            .replace("Response", "res")
            .replace("function", "fn")
            .replace("Function", "fn")
            .replace("implementation", "impl");
    }
    out
}

fn transform_sentence(sentence: &str, level: &str) -> String {
    if level == "lite" {
        return sentence.to_string();
    }

    let compact = compact_sentence(sentence, level);
    let pivoted = yoda_pivot(&compact).unwrap_or(compact);
    let inverted = sage_invert(&pivoted, level);

    if level == "roleplay" {
        let (core, _) = split_punctuation(&inverted);
        return format!("{}. Hmm.", core);
    }

    inverted
}

fn sentence_split(text: &str) -> Vec<String> {
    let mut pieces = Vec::new();
    let mut start = 0;
    let mut last_was_punct = false;

    for (idx, ch) in text.char_indices() {
        if last_was_punct && ch.is_whitespace() {
            let piece = text[start..idx].trim();
            if !piece.is_empty() {
                pieces.push(piece.to_string());
            }
            start = idx + ch.len_utf8();
            last_was_punct = false;
            continue;
        }

        last_was_punct = matches!(ch, '.' | '!' | '?');
    }

    let piece = text[start..].trim();
    if !piece.is_empty() {
        pieces.push(piece.to_string());
    }
    pieces
}

fn split_punctuation(sentence: &str) -> (String, String) {
    let trimmed = sentence.trim();
    if let Some(last) = trimmed.chars().last() {
        if matches!(last, '.' | '!' | '?') {
            let core = trimmed[..trimmed.len() - last.len_utf8()].to_string();
            return (core, last.to_string());
        }
    }
    (trimmed.to_string(), ".".to_string())
}

fn yoda_pivot(sentence: &str) -> Option<String> {
    let (core, punct) = split_punctuation(sentence);

    let because = Regex::new(r"(?i)^(.+?)\s+because\s+(.+)$").unwrap();
    if let Some(caps) = because.captures(&core) {
        return Some(format!("{}, {} for{}", &caps[2], &caps[1], punct));
    }

    let when = Regex::new(r"(?i)^(.+?)\s+when\s+(.+)$").unwrap();
    if let Some(caps) = when.captures(&core) {
        return Some(format!("when {}, {}{}", &caps[2], &caps[1], punct));
    }

    let if_clause = Regex::new(r"(?i)^(.+?)\s+if\s+(.+)$").unwrap();
    if let Some(caps) = if_clause.captures(&core) {
        return Some(format!("if {}, {}{}", &caps[2], &caps[1], punct));
    }

    None
}

fn sage_invert(text: &str, level: &str) -> String {
    let copula =
        Regex::new(r"(?i)^(.+?)\s+(is|are|was|were|will|can|should|must)\s+(.+?)([.!?])?$")
            .unwrap();
    if let Some(caps) = copula.captures(text) {
        let subject = caps.get(1).map(|m| m.as_str()).unwrap_or(text);
        let verb = caps.get(2).map(|m| m.as_str()).unwrap_or("");
        let predicate = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        let punct = caps.get(4).map(|m| m.as_str()).unwrap_or(".");
        if level == "lite" {
            return text.to_string();
        }
        return format!("{}, {} {}{}", predicate, subject, verb, punct);
    }
    text.to_string()
}

fn enforce_length_budget(input: &str, output: &str, level: &str) -> String {
    if level == "lite" || output.len() <= input.len() {
        return output.to_string();
    }

    let max_factor = if level == "full" { 1.08 } else { 1.05 };
    if (output.len() as f64) <= (input.len() as f64 * max_factor).ceil() {
        return output.to_string();
    }

    input.to_string()
}

fn preserve_code_blocks(text: &str, transform: impl Fn(&str) -> String) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut in_code = false;

    for segment in text.split("```") {
        if in_code {
            out.push(format!("```{}```", segment));
        } else {
            out.push(transform(segment));
        }
        in_code = !in_code;
    }

    out.join("")
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

    #[test]
    fn preserves_code_blocks() {
        let input = "Config is wrong. ```js\nconst token = process.env.TOKEN;\n```";
        let out = transform_text(input, "full");
        assert!(out
            .text
            .contains("```js\nconst token = process.env.TOKEN;\n```"));
    }

    #[test]
    fn builds_update_plan_for_linux_apt() {
        let plan = self_update_plan_for("linux", |cmd| cmd == "apt").unwrap();
        assert_eq!(plan.manager, "apt");
        assert!(plan.commands[0].contains("apt update"));
    }
}
