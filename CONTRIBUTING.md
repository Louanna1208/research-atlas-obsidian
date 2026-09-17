# Contributing

Please open an issue for bugs, confusing guidance, or a research workflow the current interface cannot express. Include your Obsidian version, operating system, plugin version, steps to reproduce, and a fictional example. Never attach private vault contents or unpublished results unless you deliberately intend to make them public.

## Development

Use Node 22 or later. Run `npm ci` and `npm run check`. Source for the host lives in `src/`; `vendor/atlas/` contains the complete MIT web-app snapshot. Build-time host adaptations in `src/adapt-app.mjs` deliberately fail when their expected upstream locations change. Build output `main.js` is published as a release asset, not committed.

The plugin uses an isolated, bundled iframe to preserve the complete interface and avoid leaking web-app styles into the vault. It has no runtime remote dependency. Host messages are restricted to that view's source window and random session token. Workspace writes are validated, serialized, and compared with their loaded baseline using `Vault.process`.

Research content has one authoritative representation: the workspace JSON. Markdown exports are explicitly labeled snapshots. Please do not introduce a second editable representation without a conflict and recovery design.

Before proposing a release, run the automated checks and the acceptance checklist in `VALIDATION.md`. Do not claim that automated data tests establish desktop or mobile compatibility.

## Research guidance

Keep prompts useful to beginners without presenting a universal recipe for good science. Separate observations, interpretations, predictions, and limitations. Preserve unknown dates, provisional evidence, source attribution, and reasons for a changed judgment. AI suggestions must remain distinguishable from a researcher's accepted judgment. Avoid composite idea scores or automatic promotion of claims.
