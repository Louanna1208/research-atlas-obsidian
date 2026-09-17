# 0.1.0 — Early testing release

Research Atlas brings the full web workspace into an Obsidian view: research desk, searchable graph and local neighborhoods, idea comparison, weekly plans, unified reflections and monthly reviews, detailed research guidance, all nine record types, judgment history, and reviewed JSON merges.

The plugin adds vault persistence with write acknowledgement, pre-session recovery copies, conflict protection, note linking and capture, linked Markdown snapshots, and guidance for moving from a worthwhile question through a bottleneck and changed conditions to a discriminating next test.

Free, MIT licensed, offline, no account or AI service required.

## Install

Extract `research-atlas-0.1.0.zip` into your vault's `.obsidian/plugins/` folder. The resulting `.obsidian/plugins/research-atlas/` folder should contain `main.js`, `manifest.json`, and `styles.css`. Reload Obsidian and enable Research Atlas under Community plugins. Alternatively, download those three assets separately.

## Validation and limitations

100 automated tests pass and the plugin compiles. The bundled interface has passed browser smoke checks with a simulated host. Obsidian desktop and mobile installation acceptance tests are still pending; this release is for early testing and is not approved in the Community Plugins directory.

All editable Atlas data is stored in the vault's workspace.json. Markdown exports are readable snapshots, not a two-way synchronization mechanism. The interface currently uses the web app's design and English text. Linked note paths need relinking after a rename or move. There is no live AI, automatic opportunity detection, or collaborative editing.

Please report bugs, confusing guidance, and workflow suggestions in GitHub Issues, using fictional examples instead of private research data.
