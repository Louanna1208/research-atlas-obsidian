# Research Atlas import schema, version 2

The file contains one workspace object, not a wrapper, array, Markdown block, or a list of patch commands. All fields and text support Unicode. Use empty strings for unknown text and unknown source dates. Do not add comments or trailing commas.

## Workspace

```json
{
  "schemaVersion": 2,
  "id": "workspace_stable-id",
  "name": "My research atlas",
  "nodes": [],
  "edges": [],
  "decisions": [],
  "reviews": [],
  "focusIds": [],
  "plans": [],
  "createdAt": "2026-09-16T12:00:00.000Z",
  "updatedAt": "2026-09-16T12:00:00.000Z"
}
```

This is the complete set of accepted top-level keys. IDs are nonempty strings, at most 200 characters. IDs must be unique within each record collection. `name` and record titles are nonempty strings up to 500 characters. `createdAt` and `updatedAt` use a valid UTC ISO timestamp with `Z`, including seconds; milliseconds are optional. These timestamps describe records, not an undocumented historical event.

Workspace limits: 5,000 nodes, 15,000 edges, 10,000 decisions, 2,000 reviews, 10,000 plans, and 5,000 unique focus IDs. Keep the serialized file below 25 MB. Focus IDs must reference incoming nodes. The examples use fixed bookkeeping dates only to illustrate valid syntax; generated files use their actual creation time.

## Node

```json
{
  "id": "problem_48e87c99d22d234a",
  "type": "problem",
  "title": "When does a learned strategy travel?",
  "body": "A question recorded from the supplied notes; its proposed answer remains uncertain.",
  "status": "exploring",
  "tags": ["learning", "strategy"],
  "fields": {
    "why": "What a useful answer would change.",
    "uncertainty": "The current scientific or practical bottleneck.",
    "nextStep": "A bounded action and the decision it would inform.",
    "sourceRef": "supplied-notes.md, section 2; researcher interpretation",
    "sourceVersion": "",
    "provenance": "Researcher interpretation"
  },
  "eventDate": "",
  "learnedOn": "",
  "importedAt": "",
  "createdAt": "2026-09-16T12:00:00.000Z",
  "updatedAt": "2026-09-16T12:00:00.000Z"
}
```

Only the keys above are accepted directly on a node. Allowed types: `problem`, `idea`, `paper`, `capability`, `resource`, `project`, `reflection`, `person`, `claim`.

Allowed stages: `seed`, `exploring`, `active`, `paused`, `completed`, `archived`. Stage is not scientific confidence. Completed means the intended attempt ended; a null or inconclusive result can be completed.

`body` is a string up to 30,000 characters. Tags are at most 100 nonempty strings, each at most 100 characters.

`fields` is a flat object with at most 100 string-valued entries; arrays, nested objects, booleans, and numbers are invalid. Field names are nonempty and at most 100 characters; `__proto__`, `prototype`, and `constructor` are forbidden. Field values are at most 30,000 characters. Useful keys:

| Key | Meaning |
| --- | --- |
| `why` | Motivation and scientific purpose |
| `question` | Scoped question |
| `trigger` | What prompted the idea or changed view |
| `audience` | Whose understanding or decisions could change |
| `advantage` | Demonstrated capabilities and actual access |
| `uncertainty` | Unresolved scientific or practical obstacle |
| `nextStep` | Small action and the decision it informs |
| `restart` | Pause reason and condition for revisiting |
| `evidence` | Inspectable observations or artifacts |
| `contribution` | Researcher's specific contribution, separated from team work |
| `learning` | Intended or demonstrated learning |
| `explanation` | Candidate accounts and assumptions |
| `prediction` | Expected observations under specified conditions |
| `sourceRef` | Traceable source locator and attribution |
| `sourceVersion` | Relevant document, analysis, model, or dataset version |
| `sourceUrl` | Verified HTTP(S) link, or empty string |
| `publishedOn` | Publication date as text, including a partial date when that is all that is known |
| `provenance` | Source-backed, user-reported, researcher interpretation, or AI suggestion, with qualification |

Any key ending in `Url` (case-insensitive) must contain an empty string or an absolute `http://` or `https://` URL without embedded credentials, at most 4,000 characters. Put local file paths, source identifiers, and unavailable-memory descriptions in `sourceRef`, not `sourceUrl`.

For `type: "claim"`, use these additional fields:

- `claimKind`: `observation`, `explanation`, `prediction`, `limitation`, or `""`.
- `claimStatus`: `provisional`, `supported`, `challenged`, or `""`.

An AI-inferred claim remains provisional. Supported means specific evidence supports the scoped statement; it is not a declaration of certainty.

### Three distinct dates

- `eventDate`: actual known event date, `YYYY-MM-DD` or `""`.
- `learnedOn`: when the researcher learned or encountered the content, `YYYY-MM-DD` or `""`. This determines whether a reading, resource, or capability appears as new learning in a monthly review.
- `importedAt`: actual import timestamp, UTC ISO or `""`. Leave blank for newly generated records; preserve it on existing records. Never use it to infer learning or publication date.

If only a month or year is known for an event or learning, leave the exact date blank and preserve the partial date in the body or a descriptive field. Do not invent a day. Unknown historical dates stay unknown after migration or import.

## Connection

```json
{
  "id": "edge_stable-id",
  "source": "resource_existing-in-this-file",
  "target": "problem_existing-in-this-file",
  "relation": "may provide measurement for",
  "reason": "AI suggestion to review: action sequences might distinguish strategies with equal accuracy. This requires showing that the candidate strategies predict different sequences. Source: supplied design notes.",
  "status": "suggested",
  "createdAt": "2026-09-16T12:00:00.000Z",
  "updatedAt": "2026-09-16T12:00:00.000Z"
}
```

Both endpoints must reference different nodes present in this incoming file. Relations are nonempty strings up to 200 characters; reasons are strings up to 30,000 characters. Status is `suggested` or `confirmed`. Agent-inferred relations must be suggested. Confirmed means explicitly recorded or accepted by the researcher, not scientifically established.

## Decision

```json
{
  "id": "decision_stable-id",
  "nodeId": "project_existing-in-this-file",
  "title": "Check the comparison before expanding the study",
  "body": "Researcher's recorded decision, with source attribution and any historical date.",
  "before": "A meaningful cue seemed sufficient.",
  "trigger": "Feedback raised an attention explanation.",
  "after": "The explanations need distinguishable predictions.",
  "action": "Sketch a comparison with an equally salient unrelated cue.",
  "outcome": "evidence",
  "createdAt": "2026-09-16T12:00:00.000Z"
}
```

`nodeId` can be null for a general decision; otherwise it references an incoming node. `body`, `before`, `trigger`, `after`, and `action` are strings up to 30,000 characters. `outcome` is a **choice code**, not prose: `""` (unspecified), `proceed` (try now), `evidence` (gather evidence), `pause`, or `drop` (set aside). A decision has no `updatedAt` or `eventDate` key. Preserve historical timing in its body when needed. Do not invent a decision from a suggestion.

## Review

```json
{
  "id": "review_stable-id",
  "nodeId": null,
  "period": "2026-09",
  "title": "A new measurement for an old question",
  "body": "What changed, what remains uncertain, and a possible next step. Include source attribution.",
  "createdAt": "2026-09-16T12:00:00.000Z"
}
```

`nodeId` can be null or an incoming node ID. `period` is a string up to 100 characters, normally `YYYY-MM`; leave blank if unknown. Reviews have no `updatedAt`. Use a reflection node for an ordinary thought and a review for an actual periodic retrospective; do not duplicate the same note automatically.

## Weekly plan

```json
{
  "id": "plan_stable-id",
  "nodeId": "project_existing-in-this-file",
  "week": "2026-09-14",
  "action": "Sketch the matched cue comparison.",
  "why": "Determine whether the alternatives imply distinguishable predictions.",
  "outcome": "",
  "done": false,
  "createdAt": "2026-09-16T12:00:00.000Z",
  "updatedAt": "2026-09-16T12:00:00.000Z"
}
```

`nodeId` is required and references an incoming node. `week` must be a real Monday in `YYYY-MM-DD` format. `action` is nonempty text; `why` and `outcome` are text. `done` must be a JSON boolean. Unlike a decision outcome, a plan outcome is prose about what happened. Add a new plan only if the user actually chose the action for that week; otherwise retain the suggestion in `fields.nextStep`.

## Import and migration behavior

Generate schema version 2. The application also accepts version 1 and normalizes it to version 2. Version 1 lacks new dates, claims, focus, plans, and structured decision fields; missing new dates become `""`, not today. When updating a version 1 export, preserve existing IDs, contents, and timestamps while adding empty/default version 2 fields. Never convert `createdAt` into `learnedOn`.

Incoming files are validated before merging. Referenced nodes must be included even when they already exist locally. Preserve an existing export’s workspace ID and content for incremental updates. Unknown record keys are rejected, so put extra descriptive information in string-valued node fields or note bodies, not arbitrary top-level metadata.

To append without overwriting, use Merge and keep the current version for all conflicts. Merge previews changes to matching IDs and permits conflict resolution. Replace loads the incoming workspace as a whole. Matching is by ID; similar titles do not establish identity. Do not infer that a newer bookkeeping timestamp makes a research statement more correct.
