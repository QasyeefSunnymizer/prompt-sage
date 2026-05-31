use serde::Deserialize;

#[derive(serde::Deserialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    #[serde(default)]
    pub trajectory: String,
    #[serde(default, deserialize_with = "empty_option")]
    pub insight: Option<Insight>,
    #[serde(default)]
    pub optimized_prompt: String,
    #[serde(default)]
    pub savings_pct: u16,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub border: Border,
}

#[derive(serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Insight {
    #[serde(default)]
    pub level: InsightLevel,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub body: String,
}

#[derive(serde::Deserialize, Default, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Border {
    #[default]
    Normal,
    Warning,
    Critical,
}

#[derive(serde::Deserialize, Default, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InsightLevel {
    #[default]
    Info,
    Warning,
    Critical,
}

impl Border {
    pub fn label(self) -> &'static str {
        match self {
            Self::Normal => "observing",
            Self::Warning => "intervening",
            Self::Critical => "alert",
        }
    }
}

impl InsightLevel {
    pub fn badge(self) -> &'static str {
        match self {
            Self::Info => "INFO",
            Self::Warning => "WARN",
            Self::Critical => "CRIT",
        }
    }
}

fn empty_option<'de, D>(deserializer: D) -> Result<Option<Insight>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Option::<Insight>::deserialize(deserializer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_defaults_missing_and_null_fields() {
        let missing: Snapshot = serde_json::from_str("{}").unwrap();
        assert_eq!(missing.border, Border::Normal);
        assert!(missing.insight.is_none());
        assert_eq!(missing.savings_pct, 0);

        let nulls: Snapshot = serde_json::from_str(
            r#"{"trajectory":"","insight":null,"optimizedPrompt":"","notes":"","border":"warning"}"#,
        )
        .unwrap();
        assert!(nulls.insight.is_none());
        assert_eq!(nulls.border, Border::Warning);
    }
}
