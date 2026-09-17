# Validation status — 0.1.0

This is an early testing release. Passing the following checks does not establish full Obsidian host or device compatibility.

## Completed

- 100 automated tests: the 65 upstream tests, 20 state-machine regressions repeated against the adapted app, and 15 host-adapter, bridge acknowledgement, vault-save, conflict, failure, corruption, Markdown snapshot, and script-embedding tests.
- TypeScript check and production bundle build.
- Browser smoke test of the exact bundled iframe with the same sandbox and Content Security Policy used by the plugin: full desk and graph render, graph full-screen toggle, personal workspace creation, record creation, reopening saved state, note-selection bridge, note-opening request, and five-step guidance display.
- The browser smoke test uses a simulated host, not the Obsidian application. Vault tests use an in-memory implementation of the public Vault API.

## Required before claiming a stable host-tested release

- Install release assets in a separate Obsidian test vault; enable and open the plugin.
- Create, edit, delete, undo, and reopen records; verify workspace.json matches the UI.
- Import the web demo, compare ideas, edit weekly plans and decisions, and confirm all collections survive reopening.
- Import a second version and resolve keep/current/incoming/both conflicts.
- Modify workspace.json from another view while edits are pending; verify neither version is silently overwritten.
- Capture an actual note and a selection; open a linked note; export and inspect all linked Markdown files and the complete JSON.
- Export the agent resources, inspect the ZIP, and use its validator.
- Confirm plugin disable/re-enable, window splitting, pop-out windows, light and dark host themes, keyboard access, and a small viewport.
- Test Obsidian mobile on actual iOS and Android devices before advertising verified mobile support.

## Community-directory submission

The plugin has not been submitted or approved. A public source repository, matching version tag, and main.js/manifest.json/styles.css release assets are required. Current submission uses the [Obsidian Community website](https://community.obsidian.md), an Obsidian account, and a linked GitHub account. The owner must review the developer policies and confirm the maintenance commitment. See [official submission instructions](https://docs.obsidian.md/plugins/releasing/submit-plugin).
