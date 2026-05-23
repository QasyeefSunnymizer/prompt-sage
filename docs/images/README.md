# Hand-Drawn Image Brief (README Assets)

Create these four PNG files in this folder:

1. `hero-prompt-sage.png`
2. `install-decision-map.png`
3. `mode-compression-ladder.png`
4. `safety-fallback-flow.png`

## Global Art Direction

- Style: hand-drawn, playful but clean, notebook/comic energy.
- Background: light (off-white or pale paper texture).
- Stroke: dark charcoal/navy linework, medium thickness.
- Accent colors: pick 2-3 and stay consistent across all images.
- Typography: all-caps handwritten labels or neat marker text.
- Keep text short; diagram should read in 3-5 seconds.

## Technical Specs

- Format: PNG
- Width: 1600px preferred (1400px minimum)
- Aspect ratio: around 16:9 for hero, 4:3 for diagrams
- Export at 1x and verify readability on mobile
- Leave 48-64px padding so GitHub markdown crop looks clean

## 1) `hero-prompt-sage.png`

Purpose: project identity at top of README.

Composition:

- Left: small mascot/character silhouette (original, non-copyright-copy).
- Center/right: big title text `prompt-sage`.
- Subtitle below: `same technical truth, fewer tokens`.
- Add 2-3 tiny doodles around title (terminal cursor, code bracket, arrow).

Mood:

- Funny but not chaotic.
- Should still look trustworthy to engineers.

## 2) `install-decision-map.png`

Purpose: explain install choices quickly.

Composition:

- Start node: `Pick your platform`.
- Branches:
  - `Windows -> winget / choco`
  - `macOS -> brew`
  - `Linux -> apt or dnf`
  - `Other/blocked -> curl fallback`
- Add small badge near curl branch: `inspect-first available`.

Layout:

- Top-to-bottom or left-to-right, one clear reading path.
- Avoid crossing connector lines.

## 3) `mode-compression-ladder.png`

Purpose: visualize mode tradeoff at a glance.

Composition:

- 4-rung ladder or staircase labeled bottom to top:
  - `lite`
  - `full`
  - `ultra`
  - `master`
- Add axis hint:
  - Upward arrow: `more compression`
  - Side note: `readability shifts by mode`

Style detail:

- Each rung gets one icon (for example: feather, wrench, bolt, flame).
- Keep icon style simple and consistent.

## 4) `safety-fallback-flow.png`

Purpose: communicate trust/safety behavior.

Composition:

- Input node: `User request`.
- Decision diamond: `Risky/security-sensitive?`
- No path -> `Apply sage mode`.
- Yes path -> `plain-safety output`.
- Footer note: `code/commands stay literal`.

Tone:

- Safety branch should feel clear and calm, not scary.

## Quick Self-Check Before Commit

- Can someone understand each image in under 5 seconds?
- Is every label readable on phone width?
- Do all 4 images look like one visual family?
- Does each image directly support the README section beneath/above it?
