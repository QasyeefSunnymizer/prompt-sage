use prompt_sage_rs::transform_text;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Fixture {
    input: String,
    expected_mode: Option<std::collections::HashMap<String, String>>,
    expected_mode_only: Option<String>,
}

#[test]
fn matches_mode_expectations() {
    let raw = std::fs::read_to_string("tests/fixtures/sage-snapshots.json")
        .expect("fixture file should exist");
    let fixtures: Vec<Fixture> = serde_json::from_str(&raw).expect("valid fixture json");

    for fixture in fixtures {
        if let Some(modes) = fixture.expected_mode {
            for (level, expected_mode) in modes {
                let out = transform_text(&fixture.input, &level);
                assert_eq!(out.mode_applied, expected_mode, "level={}", level);
            }
        }

        if let Some(expected) = fixture.expected_mode_only {
            let out = transform_text(&fixture.input, "roleplay");
            assert_eq!(out.mode_applied, expected);
        }
    }
}
