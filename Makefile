.PHONY: build-tui test-tui build-panel test-panel

build-tui:
	cargo build --release --manifest-path tui/Cargo.toml

test-tui:
	cargo test --manifest-path tui/Cargo.toml

build-panel: build-tui

test-panel: test-tui
