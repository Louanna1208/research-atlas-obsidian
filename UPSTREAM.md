# Upstream source

`vendor/atlas/` contains the complete browser application, tests, guide, and agent resources from [Louanna1208/research-atlas](https://github.com/Louanna1208/research-atlas), commit `0968e79f66b4474c251ba40dc23dd437de2d4432`, copyright 2026 Lan Pan, MIT license.

The Obsidian host does not load a website or remote code. Everything needed by the embedded interface is bundled in `main.js`. Host-specific changes are applied explicitly in `src/adapt-app.mjs`; `src/mentoring.js` adds the bottleneck-to-test guidance. The browser-specific backup controller is not used for vault persistence.

To update upstream, review and replace the snapshot, update this commit reference, and run both the original regression suite and adapter tests. Review the feature table in the README when making any behavioral change.
