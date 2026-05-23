# Installation Guide

`prompt-sage` installs primarily via OS-native package managers.

## Windows

- `winget install prompt-sage`
- `choco install prompt-sage`

## macOS

- `brew install prompt-sage/tap/prompt-sage`

## Linux

- Debian/Ubuntu: `sudo apt install prompt-sage`
- Fedora/RHEL: `sudo dnf install prompt-sage`
- Fallback (other distros): hosted installer script

```bash
curl -fsSL https://example.com/prompt-sage/install.sh | bash
```

## Dev-only Path

For contributors:

```bash
npm install
npm test
```

