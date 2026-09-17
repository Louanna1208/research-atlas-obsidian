---
name: research-atlas-memory
description: Turn available research notes, user-authorized memory, and conversation context into a source-aware Research Atlas JSON import, or update an existing export while preserving stable IDs and research uncertainty.
---

# Research Atlas memory import

Create an ordinary UTF-8 `.json` file that the user can inspect and import into Research Atlas. Use the user's preferred language for content. Read [references/schema.md](references/schema.md) before authoring; it defines the complete version 2 schema. [example.json](example.json) is a fictional format example, never source material for the user's research.

## Establish the available scope

Use only context, memory, and files actually available to this agent and authorized for this request. Do not claim to have searched a user's entire history or recovered unavailable conversations. Follow source references only within the requested scope. If access is missing, say what could not be used and proceed with the available material; do not fill the gap by guessing. Do not browse, message people, upload files, or publish the workspace unless separately requested.

For an update, inspect the latest user-supplied Atlas export first. Preserve its identity, existing content, IDs, and original creation timestamps. Without an existing export, create a new workspace; explain that matching against a previous unseen workspace cannot be guaranteed. Include only relevant research information. Exclude credentials, unrelated personal details, and sensitive third-party material unnecessary to the research record.

## Extract research meaning

Build records only when the material supports them:

- **Problem:** a durable question, why it matters, and the obstacle to answering it.
- **Idea:** a proposed opening, its trigger, audience, uncertainty, and possible small test.
- **Paper:** a source plus the researcher's response. Keep source findings and the researcher's interpretation distinguishable.
- **Capability:** an operation the researcher can carry out, linked to an artifact and their exact contribution.
- **Resource:** data, methods, tools, or access with actual availability and limitations.
- **Project:** a bounded attempt with a question, alternatives, evidence gap, next test, and contribution.
- **Reflection:** a change, surprise, or unresolved thought, with the earlier view preserved when available.
- **Person:** relevant expertise or a real research interaction; do not infer a collaboration or endorsement.
- **Claim:** one scoped observation, explanation, prediction, or limitation, with source/version and provisional evidence assessment.

Do not force every note into every category. Preserve unfinished thoughts and ordinary training work. Do not invent a coherent career identity, novel contribution, effect size, publication status, citation, or chronology. Distinguish the researcher's work from collaborators' work and team resources. An observed behavior, latent estimate, candidate mechanism, and future prediction are different statements.

For each substantive new record, put a traceable source locator in `fields.sourceRef` and, when available, `fields.sourceVersion`. A filename and section, supplied conversation identifier, or explicitly labeled available-memory summary is sufficient. `fields.provenance` may say `Source-backed account`, `User-reported account; not independently verified`, `Researcher interpretation`, or `AI suggestion to review`. Explain mixed provenance in the note instead of presenting it all as fact. Do not label a source independently verified if you only saw the user's account of it.

Keep AI additions visibly separate: preface new inferred content with `AI suggestion to review:` and put the rationale and source in the note. New AI-suggested claim records must remain `claimStatus: "provisional"`. Do not overwrite the researcher's judgment with a tidier synthesis.

## Preserve dates and identity

`createdAt` and `updatedAt` are record bookkeeping timestamps. Use the actual generation time for new records, not invented research dates. `eventDate` is the known historical event date; `learnedOn` is when the researcher learned or encountered the material. Leave either `""` when unknown. An old paper imported today is not automatically this month's learning. Preserve partial historical dates as text rather than inventing a day. Leave `importedAt: ""` on newly generated records; the application records an actual import.

Reuse existing IDs before matching by title. Match entities using stable source identity, record type, and substantive meaning; identical titles alone are insufficient. For new IDs, use a repeatable key such as `<type>_<first 16 hex characters of SHA-256(type + "|" + stable source locator + "|" + original identifying phrase)>`. Keep the same original key on later updates even if the display title changes. If there is no stable source locator, use a consistent local locator for the available context and report the limitation. Check collisions and disambiguate with a stable suffix. Use existing edge IDs; new edge IDs can hash source ID, relation, and target ID. Never silently merge two scientifically different statements.

For an incremental import, prefer a complete updated copy of the latest export, preserving unchanged records exactly. All edge endpoints and linked record IDs must exist inside the incoming JSON, even if those records already exist in the browser. The app validates the incoming file before merging. Do not discard records that were simply outside this extraction's source scope.

## Add relationships and judgment records carefully

Use directional relations that explain reasoning: supports, challenges, depends on, provides measurement, proposes an alternative, reframes, inspires a test, or another appropriate verb. Every new edge needs a reason explaining the source, bridge, assumptions, and scope. **Any relation inferred by the agent must be `suggested`.** Use `confirmed` only for a relationship explicitly recorded or accepted by the researcher, or preserved from their export. Confirmed means an accepted personal judgment, not scientific truth.

Use a decision for a substantive research choice or change: before → trigger → after → action. Preserve the actual choice; do not invent decisions or mark work done. A reflection node is suitable for a free-standing thought, while a review is a dated monthly retrospective. Avoid duplicating one reflection in both places. New focus IDs and weekly plans require an explicit user choice in the available source; otherwise keep the existing ones or use empty lists. Put unaccepted suggested next actions in node fields, not in a fabricated weekly commitment.

## Validate and deliver

Write the file, parse it, and validate it with the included dependency-free Node.js helper when available:

```sh
node scripts/validate.mjs /path/to/research-atlas.json
```

The helper checks shape and references; it cannot verify research facts. If Node.js is unavailable, inspect the schema and reference integrity using the available runtime, and report that the bundled validator was not run. Do not claim validation that did not occur.

Deliver the JSON and a short companion report identifying source scope, unavailable context, uncertain dates or claims, AI-suggested connections, and potentially conflicting updates. Keep that report outside the JSON because the schema rejects unsupported top-level keys. Tell the user to review the import preview: use Merge and keep the current version for conflicts to append without overwriting; Merge also permits selecting incoming versions; Replace loads the incoming workspace as a whole. Do not import into a live workspace or overwrite a source export unless requested.
