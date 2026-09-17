# Research Atlas

**Keep the reasoning that makes an idea worth returning to.** A free, offline research workspace for Obsidian, with the complete [Research Atlas web app](https://louanna1208.github.io/research-atlas/) workflow and guidance for developing research judgment.

## Why this exists

Research leaves behind papers, unfinished ideas, analysis notes, feedback, abandoned experiments, and judgments made in conversation. Finding a file again is only part of the difficulty. The harder part is recovering what you were thinking: why a question mattered, why you paused it, and what would make it worth another attempt.

Two months later, a new method might remove an old measurement bottleneck. A class might give you the mathematics you were missing. A conversation might reveal that two apparently competing explanations make the same prediction. Those changes matter only if you can reconnect them to the question you were trying to answer.

For researchers just starting out, there is another difficulty: learning what makes a question worth pursuing. AI can produce more ideas than you could reasonably test. It cannot relieve you of deciding which uncertainty matters, which evidence you trust, or what a useful next step would teach you.

Research Atlas provides a starting structure, so you do not have to design an entire research system before using it:

> Why is this question worth doing → where is it stuck → what has changed → why might the new connection help → what should I test next?

It helps you preserve the growth of your research taste: **what you judged, with the information you had, and why you later changed your mind.** The guidance offers prompts and examples; your judgments remain yours. You can begin with one sentence and develop the reasoning later.

## The complete workspace

This version carries over all six main views and all nine record types from the web app. It is not limited to note templates.

| Area | What you can do |
| --- | --- |
| Research desk | Choose a small set of focus items, return to open questions, and see recent judgment changes. |
| Research atlas | Search and filter records, explore the interactive graph or list, inspect local neighborhoods, and expand the map to fill the plugin view. |
| Research records | Keep problems, ideas, readings, capabilities, resources, projects, reflections, people, and claims. Record demonstrated capability and contribution, sources and uncertainty. |
| Reasoned connections | Add directional relations with reasons; accept, revise, or reject suggested connections. |
| Idea portfolio | Compare up to three ideas side by side, then record a choice and its reasoning without a composite score. |
| Scientific reasoning | Separate observations, explanations, predictions, and limitations; retain evidence assessments and judgment history. |
| This week | Deliberately choose dated actions, record why they matter and what happened, and retain completed actions in their original week. |
| Reflections | Read reflections, reviews, and decisions together; compare old questions with knowledge learned in a selected month. Imported history is not treated as newly learned knowledge. |
| Research guide | Use detailed explanations, prompts, examples, and common traps, including the five-step question-to-test path. |
| Import and recovery | Import the web app's JSON, preview additions and conflicts, explicitly merge or replace, and export a complete backup. |
| Work with your agent | Export the bundled memory skill and schema; review the resulting JSON before merging. No AI account is needed. |
| Example workspace | Explore a fictional research journey independently of your personal workspace. |

Browser-specific persistence is replaced by vault saving. JSON downloads, Markdown briefs, meeting agendas, journals, and agent resources are saved into the vault's `Exports` folder.

## Obsidian integration

- Open Research Atlas from the ribbon or the **Research Atlas: Open workspace** command.
- Link an Atlas record to an existing Markdown note and open it from the inspector.
- Capture a vault note, or selected text through the editor command, as a reflection with its source path. The plugin does not infer what the note means.
- Export the complete saved workspace as linked Markdown notes, with connections, reasons, judgment history, reviews, weekly plans, and an index. Keep the accompanying JSON for a lossless reimport.
- Continue where you left off when you reopen the vault; no repeated import is needed.

**Markdown exports are snapshots.** Editing them does not change the Atlas workspace. Linked notes are references, not automatically synchronized records. Relink notes after renaming or moving them. The plugin currently preserves the web app's visual design inside an isolated view; it does not inherit every Obsidian theme setting.

## Install the early testing release

This is an **early testing release**, not a plugin already approved for the Community Plugins directory. Obsidian desktop and mobile installation acceptance tests are still pending. The embedded interface and data layer have been tested separately; see [VALIDATION.md](VALIDATION.md).

1. Download `research-atlas-0.1.1.zip` from [Releases](https://github.com/Louanna1208/research-atlas-obsidian/releases).
2. Extract the `research-atlas` folder into `<your vault>/.obsidian/plugins/`.
3. Confirm that `main.js`, `manifest.json`, and `styles.css` sit directly inside `.obsidian/plugins/research-atlas/`.
4. Reload Obsidian. In **Settings → Community plugins**, enable **Research Atlas**.
5. Run **Research Atlas: Open workspace**. Begin with the fictional example or choose **Start my workspace**.

You can also build from source with Node 22 or newer:

```sh
npm ci
npm run check
```

Copy the generated `main.js`, plus `manifest.json` and `styles.css`, into that plugin folder. Obsidian 1.6.0 or later is required by the manifest. The code uses no Node or Electron APIs at runtime, but mobile behavior still needs device testing.

## Your first fifteen minutes

1. Open **Research guide → From a question to a worthwhile next test**. Choose one puzzling observation; you do not need to decide your lifelong research interests.
2. Create a **Problem** or **Idea**. Keep the question and why you care in your own words. Expand the optional reasoning fields when useful.
3. Record the bottleneck precisely. For example, “I cannot distinguish these strategies from final accuracy,” instead of “I need more data.”
4. Add a **Reading**, **Capability**, or **Resource** for a method you encountered. Record the actual learning date when known, plus its source and limits.
5. Connect it to the question. Explain what it might make possible and what still needs checking. Keep an AI-proposed connection **Suggested** until you review it.
6. Compare alternatives in **Idea portfolio** if needed. Record whether to try, gather evidence, pause, or set aside—and why.
7. Put one small test in **This week**. After trying it, record what happened and whether it changed your judgment.

The next time you return, your research desk and judgment history should help you pick up the thread. The [full guide](USER_GUIDE.md) explains the existing workflows.

## Saving and recovering your work

By default, the plugin creates:

```text
Research Atlas/
  workspace.json   # Complete editable Atlas data
  Backups/         # Recovery copies from before session edits
  Exports/         # Deliberate JSON, Markdown, and agent-resource exports
```

The save indicator reports **Saved in vault** only after Obsidian confirms the write. Before the first edit to an existing workspace in each view session, the plugin keeps the previous version in `Backups`. These copies are not automatically deleted. Include the folder in your normal vault backup; copies on the same device do not protect against losing that device.

If another view or sync service changes the file, saving pauses instead of overwriting it. Export your current workspace from **Backup & workspace**, use **Reopen saved copy**, then import your export and resolve the conflicts. The plugin does not provide collaborative editing or its own cloud synchronization.

To move from the web app, export its JSON, then use **Backup & workspace → Import & preview** in the plugin. The schema, IDs, history, and merge behavior are shared. Changing the plugin's workspace-folder setting opens a different workspace next time; it does not move existing files.

## Privacy, AI, and cost

Free under the MIT license. No account, subscription, telemetry, ads, automatic AI calls, or background network requests. Runtime file operations stay within your vault. External links open only when you choose them; any separate vault sync service follows its own settings.

The bundled agent skill is optional. You decide which sources to give your agent and review its proposed records and connections. The plugin does not score idea quality, turn provisional observations into conclusions, or automatically discover scientifically valid connections.

## Feedback and contributions

This project is especially interested in feedback from people beginning research, and people returning to a large collection of unfinished questions.

Please [open an issue](https://github.com/Louanna1208/research-atlas-obsidian/issues) with a bug, a confusing step, a missing workflow, or a suggestion. Useful examples include:

- “I saved an idea, but could not recover why I cared about it.”
- “This prompt helped me distinguish two explanations.”
- “I wanted to connect a new method to a paused problem, but got stuck here.”
- “This field added work without helping me decide anything.”

Use fictional or anonymized examples rather than unpublished research or private conversations. Contributions to guidance, accessibility, interoperability, tests, and translations are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

The full interface, model, guide, examples, tests, and agent resources are adapted from [Research Atlas](https://github.com/Louanna1208/research-atlas), also by Lan Pan under MIT. This is an independent community project, not an official Obsidian product.
