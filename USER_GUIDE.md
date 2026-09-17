# Research Atlas · v0.2

A browser-based research workspace for recovering thoughts, connecting evidence, and making research choices. Keep questions, ideas, reading notes, capabilities, resources, projects, reflections, people, and scoped claims in one growing map. This independent tool is a thinking aid, not an endorsed advising framework or a measure of research quality.

## Open in Obsidian

Install the release assets as described in [README.md](README.md), then run **Research Atlas: Open workspace**. The complete interface runs locally inside the plugin.

## Research workflows

- **Research desk:** the default home shows questions you deliberately select as your current focus, selected next steps, and recent judgment changes. Active projects do not automatically become priorities.
- **Research atlas:** capture a title and note, then expand optional reasoning fields. Search notes and connection reasons, filter by type or stage, inspect a project's local neighborhood, or use the library list. Selecting a result preserves search context. Pan, zoom, drag, or select graph nodes with the keyboard. **Full screen** expands the graph view; use its exit control or Escape to return.
- **Idea portfolio:** compare up to three ideas using audience, advantage, uncertainty, training value, next test, and revisit conditions. Record a choice—try now, gather evidence, pause, or set aside—with its reason. There is no combined research-quality score.
- **Projects and claims:** connect a question to candidate explanations, observations, uncertainty, predictions, and the next informative action. Claim records distinguish observations, explanations, predictions, and limitations. Provisional, supported, and challenged describe your assessment of a scoped statement. Completed is available for finished attempts, including inconclusive ones.
- **Connections:** use a suggested relationship or name your own, then record its source, assumptions, scope, and consequences. Suggested links can be reviewed, revised, accepted, or rejected. Acceptance records your judgment; it does not certify scientific truth.
- **This week:** explicitly choose actions for a particular week, explain why they matter, record outcomes, and mark actions complete. Move between weeks, revisit paused records through restart conditions, and export an agenda using the selected week's plans.
- **Reflections:** reflection nodes, monthly reviews, and research decisions appear in one thinking history. A project also shows its linked judgment changes. Structured decisions preserve the earlier view, new evidence or feedback, revised view, and resulting action. Ordinary text edits do not create a full version history.
- **Old questions × new knowledge:** select a problem and something actually learned in the chosen month. Monthly learning uses `learnedOn`, never import or record-creation time. Undated historical notes remain in the atlas and are excluded from monthly new knowledge.
- **Research guide:** step-by-step guidance and expandable field help explain how to read for old problems, locate bottlenecks, compare explanations, choose small tests, document contributions, and revisit judgments. Worked examples are fictional; fields remain optional when capturing a thought.
- **Prepare discussion:** review, copy, or download a Markdown brief for a conversation. Agenda and journal exports are also available. The app does not call an AI service or send messages.

## Saving and recovery

The complete personal workspace saves through the Obsidian Vault API to the configured folder's workspace.json. Reopen the same vault to continue without importing again. Wait for **Saved in vault**; a pending or failed write is not a confirmed save.

Before the first edit of an existing workspace in a view session, the plugin keeps a recovery copy in Backups. Deliberate exports, discussion briefs, agendas, journals, and agent resources go to Exports. Back up the vault using your normal backup system; copies inside the same vault are not off-device protection.

If the saved file changes elsewhere, automatic saving stops. Export the current view, use **Reopen saved copy** in the plugin toolbar, then merge the export after reviewing conflicts. Invalid stored JSON is preserved and must be repaired or replaced from a known-good backup before saving can resume.

**Export linked Markdown** writes a readable snapshot of the last saved personal workspace, including its full JSON. Markdown edits do not automatically change Atlas data. Linked Obsidian note paths remain references; relink them if you move or rename the note.

Deleting an element removes its connections and linked weekly plans; historical decisions and reviews remain with the deleted link detached. Immediate deletion undo is invalidated by later mutations or workspace switches. Graph positions are temporary display state and are not exported.

## Importing and updating

Import validates the complete incoming JSON and shows a preview. Nothing changes until you apply it. The preview identifies new records, unchanged records, matching-ID conflicts, and similar titles with different IDs.

- **Merge** keeps current content and adds new records. Each conflicting ID requires an explicit choice: keep the current version, use the incoming version, or keep both. Keeping both gives the incoming version a separate identity and preserves its linked branch. To append without overwriting, choose Merge and keep the current version for conflicts.
- **Replace** loads the incoming workspace as a whole, including its history and plans. It requires an additional confirmation. Export the current workspace before replacing it if you may need to recover it.

Matching uses **stable IDs**, not titles. Similar titles with different IDs remain separate; cancel and correct IDs in the incoming file if they should represent the same record. Every referenced node must be included in the incoming file, even when it already exists in the workspace, because validation happens before merging. A newer bookkeeping timestamp does not make an incoming research claim more correct.

Research event dates, learning dates, publication metadata, and import time have separate roles. Importing an old paper today does not add it to this month's learning. See [the schema guide](vendor/atlas/agent-skill/research-atlas-memory/references/schema.md) for fields, validation limits, and migration rules.

## Use your own agent to prepare an import

Download [the skill package](vendor/atlas/agent-skill/research-atlas-memory.zip), extract it, and give your agent the research-atlas-memory folder plus relevant notes or memory it can access. The package contains [SKILL.md](vendor/atlas/agent-skill/research-atlas-memory/SKILL.md), the schema reference, a fictional example, and a standalone Node.js validator. Some agents support installing skill folders; others can follow the attached instructions directly.

A starter prompt:

> Use the attached Research Atlas memory skill and its schema. Build an importable JSON from memories and sources you can actually access. Do not invent dates, findings, citations, ownership, or confirmations. Separate my interpretation from source evidence and your suggestions. Preserve uncertainty and mark inferred relationships as suggested. If I provide an existing workspace export, reuse its IDs and preserve my judgments. Return a validated JSON file and a short report of sources used, unavailable context, and unresolved gaps. Do not publish or send the workspace.

For an incremental update, **export your latest workspace first and give that export to the agent**. Ask it to preserve unchanged records, IDs, creation timestamps, and existing judgments while adding or updating the requested material. Then inspect the application's merge preview. Without the existing export, the agent cannot reliably match records it has never seen.

The skill instructs agents to distinguish personal from team contributions, keep unknown dates blank, preserve provisional mechanisms, and avoid turning suggested actions into invented weekly commitments. These are behavioral instructions. The application validates structure and presents user-controlled statuses; it cannot authenticate an import's authorship, independently verify its evidence, or determine whether an agent labeled its suggestions honestly. Review important claims, ownership, dates, and links yourself.

To validate a generated file using the package:

~~~sh
node agent-skill/research-atlas-memory/scripts/validate.mjs /path/to/research-atlas.json
~~~

The validator checks schema and references without changing the file. It does not verify research facts. The app makes no live AI calls; you decide what to share with an external assistant.

## Development and limitations

See [CONTRIBUTING.md](CONTRIBUTING.md) for the host architecture and build instructions, [UPSTREAM.md](UPSTREAM.md) for the shared application source, and [VALIDATION.md](VALIDATION.md) for the current testing status.

The plugin provides no live AI service, automatic opportunity detection, collaborative editing, or automatic two-way Markdown synchronization. Current interface text is English. The five-step guide and field help are intended to support judgment, not to certify an idea's value or a claim's truth.
