/** Original practical guidance. Examples describe a fictional strategy-learning study. */
export const GUIDES = {
  home: {
    title: 'Return to your research',
    intro: 'Use this workspace to recover a train of thought, choose a useful next step, and keep the reasons for your choices. A first year can include reading, training, small replications, and uncertain interests. Your research identity can emerge from those experiences.',
    steps: [
      { title: 'Start from one real moment', body: 'Capture a question from a paper, an observation from a pilot, or something you could not explain in a conversation. A title and two sentences are enough to begin.', prompt: 'What happened, and why do I want to return to it?', example: 'Two tasks seem to share a strategy, but people may not recognize the connection. I want to know what makes the structure visible.' },
      { title: 'Recover where you stopped', body: 'Open a current project and read its uncertainty and latest decision before adding tasks. If these no longer describe the situation, record what changed.', prompt: 'What was unresolved when I last worked on this?' },
      { title: 'Choose a small focus', body: 'Pin the few problems or projects that deserve your attention now. An active project is an ongoing commitment; a weekly plan is an action you deliberately choose for this week.' },
      { title: 'Make the next step informative', body: 'Write the action and the decision it will help you make. Reading, drawing a design, checking an assumption, or asking for feedback can be valuable research work.', example: 'Compare two cue designs to see whether they predict different behavior. If they do not, improve the design before collecting data.' },
      { title: 'Leave a way back in', body: 'At the end of a session, record what you learned, what remains ambiguous, and where to restart. Connect that note to the relevant project so you can recover the context later.' },
      { title: 'Let patterns develop', body: 'Occasionally look across your questions, capabilities, and completed work. Notice recurring interests without forcing every project into one story. Keep room for unrelated exploration and changes of mind.' }
    ],
    pitfalls: ['A filled dashboard is not a requirement for productive research.', 'A graph with more connections does not necessarily contain better reasoning.', 'Do not treat a quiet week or an informative pause as a failure.'],
    doneWhen: 'You can say where you stopped, what matters now, and why one next action is worth doing.'
  },
  problem: {
    title: 'Find a question worth returning to',
    intro: 'A problem names something you want to understand. It can outlive a particular tool, dataset, or project. You do not need to prove that it is unique before keeping it.',
    steps: [
      { title: 'Describe the phenomenon', body: 'Specify whose behavior or which system you want to explain, under what conditions, and what is puzzling. Start with observable behavior before naming a mechanism.', prompt: 'What happens, and what would I have expected instead?', example: 'A person can solve each task separately yet may fail to reuse a strategy across them.' },
      { title: 'Explain why an answer matters', body: 'Identify a scientific belief, measurement choice, or practical decision that an answer could change. Try explaining the question to someone outside your field, then restore technical detail where it matters.', prompt: 'After a good answer, what would somebody understand or do differently?' },
      { title: 'Recover the history', body: 'Look for earlier formulations and later attempts. Record what those sources actually asked and which part remains unclear to you. The age of a question is a reason to investigate its history, not proof that nobody has solved it.' },
      { title: 'Name the bottleneck', body: 'Distinguish a missing observation, an ambiguous measure, competing explanations with similar predictions, missing resources, and an execution difficulty. Different obstacles require different next steps.', example: 'Current accuracy scores cannot distinguish failing to recognize a shared structure from recognizing it but being unable to execute the strategy.' },
      { title: 'Connect a possible opening', body: 'Link a method, resource, capability, or collaborator only after explaining which bottleneck it might address. Keep the connection provisional if its usefulness is still uncertain.', prompt: 'What becomes observable or testable with this addition?' },
      { title: 'Choose a bounded return point', body: 'Write a next action or a condition for returning. It is useful to keep a promising problem even if the right measurement or collaboration does not exist yet.' }
    ],
    pitfalls: ['A tool combination is not yet a question.', 'Do not equate a literature gap with scientific importance.', 'A newly discovered old paper is new to you; a historical paper imported today may not be.'],
    doneWhen: 'A future reader can recover the phenomenon, why it matters, the main obstacle, and one plausible way to investigate it.'
  },
  idea: {
    title: 'Turn a spark into an inspectable idea',
    intro: 'An idea is a possible way to make progress on a problem. Keep the original spark and develop it when a decision becomes useful. Recording an idea does not commit you to carrying it out.',
    steps: [
      { title: 'Preserve the spark', body: 'Write what occurred to you, what triggered it, and why it seemed interesting. Include enough context to reconstruct the thought months later.', example: 'A shared visual cue might help people recognize that a previously learned strategy is relevant. I thought of this while rebuilding the task interface.' },
      { title: 'Locate the contribution', body: 'State the question, intended audience, and what success would add. A contribution may be explanation, measurement, replication, infrastructure, or training. Name it at its actual scale.' },
      { title: 'Check the nearest alternatives', body: 'Record relevant prior work and other ways of addressing the same question. If the literature has not been checked, say so. Describe novelty as a question to investigate rather than a score.' },
      { title: 'Identify your actual advantage', body: 'Separate capabilities you have demonstrated, resources you can access, and support you hope to obtain. An advantage can be a useful combination; it does not require being the only person capable of the work.' },
      { title: 'Separate scientific and practical uncertainty', body: 'A design might be easy to build but unable to distinguish explanations. Another might be scientifically informative but require data you do not have. Record both when they matter.' },
      { title: 'Design a small decision-changing attempt', body: 'Choose the smallest action that reduces the main uncertainty. State what different outcomes would change, including an inconclusive outcome.', example: 'Before running a study, compare predictions for a meaningful cue and an equally noticeable unrelated cue. If both explanations predict the same result, revise the manipulation.' },
      { title: 'Make a provisional choice', body: 'Use the portfolio to choose: try now, gather evidence, pause, or set aside. Record why and what would make you reconsider. Preserve the idea even when it is not the best current use of time.' }
    ],
    pitfalls: ['An attractive method can hide an unclear question.', 'Avoid invented probabilities of success or objective impact scores.', 'A small training project can be a sensible choice even when its scientific scope is modest.'],
    doneWhen: 'Someone can understand the question, proposed opening, key uncertainty, and decision that a small test would inform.'
  },
  paper: {
    title: 'Read for problems, evidence, and possibilities',
    intro: 'A reading note preserves the source and your response to it. Older work can reveal durable questions; recent work can supply new methods. Either can contain both. The aim is to recover your thinking, not to write a second abstract.',
    steps: [
      { title: 'Anchor the source', body: 'Record a verified title or stable identifier, version, and a usable link when available. Keep publication date separate from the date you encountered it. Leave unknown dates blank.' },
      { title: 'Reconstruct the question', body: 'Before summarizing the method, ask what the authors wanted to explain and why their question mattered in its original context. If your question differs, record that difference.', prompt: 'What would the authors have considered a useful answer?' },
      { title: 'Separate finding and interpretation', body: 'Record the measured observation, the authors’ proposed explanation, and your own reading as distinct statements. Preserve conditions and limitations. A prediction by a model is not automatically an observation about people.' },
      { title: 'Locate the unresolved obstacle', body: 'Ask whether a question was left open because of data, measurement, computation, an untested assumption, or genuinely indistinguishable explanations. Check later literature before describing it as still unsolved.', example: 'This fictional reading note asks whether strategy reuse requires recognizing a shared structure. The old design records only final accuracy, so recognition and execution remain hard to separate.' },
      { title: 'Write your response', body: 'Record what surprised you, which step you doubt, what you had expected, or what you would need to understand next. A question in your own words is more useful than an unexamined summary.' },
      { title: 'Add one meaningful connection', body: 'Connect the reading to a problem it raises, a claim it supports or challenges, or a method it makes available. Give the reason and the scope. If you cannot yet explain the connection, leave it as a suggestion.' },
      { title: 'Choose whether to act', body: 'You might reread a figure, trace a cited source, reproduce a small result, add a problem, or simply keep the note. Set Learned on only when you know when it entered your thinking; importing it does not make it newly learned.' }
    ],
    pitfalls: ['Do not confuse the authors’ interpretation with a demonstrated mechanism.', 'A source remembered from conversation is not a verified citation.', 'Unresolved for you and unresolved in the field are different claims.'],
    doneWhen: 'You can recover the source’s question, relevant evidence, its limits, your own response, and why you kept it.'
  },
  capability: {
    title: 'Describe what you can do, with evidence',
    intro: 'A capability becomes useful when it names a research operation and points to work that demonstrates it. Your profile can grow through small artifacts and increasing independence, even before a publication.',
    steps: [
      { title: 'Use an action statement', body: 'Replace broad labels such as coding or experiments with something another researcher could ask you to do.', example: 'I can build a browser task that records action sequences and checks its trial randomization.' },
      { title: 'Attach a concrete artifact', body: 'Link a project, analysis, derivation, documented replication, or design memo. Describe what a reader would inspect to assess the capability. A paper title alone may not reveal your contribution.' },
      { title: 'State your role accurately', body: 'Separate what you did independently, what you did with guidance, and what collaborators supplied. A team resource can support your work without becoming a claim that you built it.' },
      { title: 'Mark the limits', body: 'Explain the conditions under which you have used the skill, what remains unfamiliar, and whether you could explain or reproduce the work. Do not infer expertise solely from access to a tool.' },
      { title: 'Connect capability to a question', body: 'Show which step of a problem or project the capability enables. Combinations of measurement, theory, methods, and domain knowledge can become distinctive through use.' },
      { title: 'Choose a growth opportunity', body: 'Name a feasible next exercise or a form of collaboration. At a later review, compare what once required help with what you now complete and defend independently.' }
    ],
    pitfalls: ['A list of software names is weak evidence of research capability.', 'Do not turn aspirations into completed achievements.', 'Distinctiveness can emerge through exploration; it does not need to be declared immediately.'],
    doneWhen: 'The record states what you can do, where you demonstrated it, your exact contribution, and its current limits.'
  },
  resource: {
    title: 'Record a resource and the opening it creates',
    intro: 'A dataset, method, instrument, codebase, or access arrangement can change what is feasible. Record what it enables and the conditions under which it can actually be used.',
    steps: [
      { title: 'Identify what exists', body: 'Name the resource, its owner or source when appropriate, and a version or access date. Distinguish something already available from something you might obtain.' },
      { title: 'Describe its contents and limits', body: 'For data, identify the population, measurements, coverage, and relevant missingness. For a tool, describe its inputs, outputs, and assumptions. Record only the detail necessary to judge the intended use.' },
      { title: 'Check access conditions', body: 'Record practical restrictions such as permission, cost, compute, documentation, or collaboration requirements. Keep private credentials outside the workspace.' },
      { title: 'Connect it to a bottleneck', body: 'Explain which question becomes more tractable and why. More data or a faster tool is useful only in relation to an operation you need.', example: 'An action-sequence logger may distinguish two strategies that end with the same accuracy, provided the logged actions actually differ between them.' },
      { title: 'Choose a feasibility check', body: 'Inspect a sample, reproduce one output, or confirm access before relying on the resource for a major commitment. Add a learning goal if using it requires a new capability.' }
    ],
    pitfalls: ['Publicly described does not always mean available to you.', 'A larger dataset may still omit the measurement your question needs.', 'Record access, ownership, and your contribution separately.'],
    doneWhen: 'You know what the resource contains, whether you can use it, its limitations, and the question it could help address.'
  },
  project: {
    title: 'Build an argument around a research attempt',
    intro: 'A project is a bounded attempt to learn or discover something. The fields are thinking aids. Develop the ones that matter now; an early exercise does not need a complete theory or publication plan.',
    steps: [
      { title: 'Recover the question', body: 'Describe what you want to learn and the scale of the attempt. Connect it to a durable problem when useful. Distinguish a research result from a training goal.' },
      { title: 'List plausible answers', body: 'Write competing explanations before choosing a preferred story. State the assumptions each needs. If you have only one account, ask what else could produce the same observation.', example: 'A visual cue may help recognize a shared structure; alternatively, any salient cue may increase attention.' },
      { title: 'Attach evidence at the right level', body: 'Link observations, sources, and analyses to the claims they bear on. Include versions and relevant conditions. Separate direct observations from latent estimates and interpretations.' },
      { title: 'Identify what remains indistinguishable', body: 'Write the specific gap between the evidence and the conclusion. It may require a different measurement, a control, a literature check, or a narrower claim rather than more of the same data.' },
      { title: 'State what would change your mind', body: 'Describe a manipulation and competing predictions when possible. Include outcomes favoring each explanation, neither, or an inconclusive measurement. If the predictions overlap, checking identifiability may be the next useful step.' },
      { title: 'Choose a feasible next test', body: 'Pair a bounded action with the uncertainty it addresses. Confirm the data, code, access, and time actually available. A pilot should answer its own small question before supporting a broader commitment.' },
      { title: 'Keep the turning points', body: 'When the scientific question, interpretation, or choice changes, record the previous view, new evidence or feedback, revised view, and action. Ordinary wording edits do not need a judgment entry.' },
      { title: 'Close or pause deliberately', body: 'Use Completed when the intended attempt has ended, even if it did not produce the hoped-for effect. Save the artifact, limitation, and next question. For a pause, record a specific restart condition.' }
    ],
    pitfalls: ['An active status does not automatically place a project in this week’s plan.', 'More analysis is not a complete next step; explain which uncertainty it addresses.', 'A successful prototype does not by itself validate a scientific explanation.'],
    doneWhen: 'You can trace the current question through evidence and ambiguity to a next test with a clear decision purpose.'
  },
  reflection: {
    title: 'Make a change in understanding recoverable',
    intro: 'A reflection can capture a surprise, disagreement, difficulty, or emerging interest. It is useful even when it produces no immediate decision. Connect it to the relevant record so the context survives.',
    steps: [
      { title: 'Recover the earlier view', body: 'Write what you expected or believed at the time. Use an earlier note if it exists. If you are reconstructing the view from memory, say so instead of presenting it as a contemporaneous record.' },
      { title: 'Name the trigger', body: 'Identify the evidence, failed attempt, conversation, or reading that prompted the reflection. Describe what was new rather than pasting an entire transcript.' },
      { title: 'Describe what changed and what did not', body: 'State the revised judgment at its appropriate scope. You may have learned that a measure is ambiguous without rejecting the whole research question.', example: 'I expected a meaningful cue to be decisive. A peer pointed out an attention account, so I now need a matched salience comparison.' },
      { title: 'Keep unresolved disagreement', body: 'Record feedback separately from your response. You can accept part of a critique, remain uncertain about another part, and specify what would settle the difference.' },
      { title: 'Choose a consequence, if any', body: 'Link to a next action, a decision, or a problem to revisit. A reflection can also remain an open thought without generating a task.' },
      { title: 'Look for a learning pattern', body: 'At review time, ask whether similar turns recur: underestimating a measurement problem, learning to compare alternatives, or becoming more independent. Avoid judging earlier choices using information you only gained later.' }
    ],
    pitfalls: ['A clean retrospective story can erase real uncertainty.', 'Preserve your interpretation alongside feedback; agreement is not mandatory.', 'A bad outcome does not automatically mean the original decision was unreasonable.'],
    doneWhen: 'You can recover the earlier view, trigger, revised understanding, and any consequence without relying on memory.'
  },
  person: {
    title: 'Map useful intellectual relationships',
    intro: 'A person record helps you remember relevant expertise, conversations, and complementary contributions. Keep it respectful, limited to research context, and useful for a real question.',
    steps: [
      { title: 'Record the relevant context', body: 'Note how you know the person’s work and which question or method connects you. A public profile can be a source; a name alone is not evidence of collaboration.' },
      { title: 'Identify complementary expertise', body: 'Describe what you could learn from them and what you might contribute. Distinguish verified experience from assumptions based on a title or affiliation.' },
      { title: 'Preserve a substantive exchange', body: 'If a conversation changed your thinking, save the idea or feedback with enough context and connect it to a reflection or decision. Do not store unrelated private details.' },
      { title: 'Prepare a specific discussion', body: 'State the question, what you have already considered, and the uncertainty where their perspective could help. The workspace can prepare a brief; it does not contact anyone for you.' },
      { title: 'Update the relationship accurately', body: 'Distinguish hoped-for contact, an actual exchange, agreed collaboration, and completed contributions. Do not treat a potential collaborator’s resources as already available.' }
    ],
    pitfalls: ['Avoid turning a network into a ranking of people.', 'A conversation does not establish an endorsement or a commitment.', 'Store only information appropriate to keep and export.'],
    doneWhen: 'You can explain the research connection, what is known, and a specific reason to return to the conversation.'
  },
  claim: {
    title: 'Separate observations, explanations, and predictions',
    intro: 'A claim record preserves one inspectable statement. Its kind describes the role of the statement; its status describes your current assessment of the evidence. Neither is a certificate of truth.',
    steps: [
      { title: 'Write one scoped statement', body: 'Include the population or system, conditions, measure, and relevant qualification. Split compound statements when one part is observed and another is inferred.' },
      { title: 'Choose the kind', body: 'Observation: what was measured. Explanation: a candidate account of why. Prediction: an expected observable result under stated conditions. Limitation: a boundary on what can be concluded.', example: 'Observation: participants chose the same final answer. Explanation: they used the same strategy. The first statement alone does not establish the second.' },
      { title: 'Attach an inspectable source', body: 'Record the paper section, analysis output, notebook, or conversation note and its version. If based only on memory, label that limitation. Never create a citation to make a statement look complete.' },
      { title: 'Compare alternatives', body: 'Ask what else could produce the observation, what assumptions connect evidence to explanation, and whether the current data distinguish those alternatives.' },
      { title: 'Choose a provisional assessment', body: 'Use Provisional when evaluation remains open, Supported when specified evidence supports the scoped statement, and Challenged when counterevidence or a limitation needs attention. Supported does not mean proved.' },
      { title: 'Connect and preserve revisions', body: 'Use supports, challenges, provides measurement, or proposes an alternative, with a reason. When the assessment changes, record the evidence and resulting change in a decision or reflection.' }
    ],
    pitfalls: ['A behavioral pattern does not uniquely identify a mechanism.', 'An AI summary must not upgrade a preliminary observation to an established explanation.', 'A null-looking estimate can reflect limited precision; preserve uncertainty.'],
    doneWhen: 'The statement’s role, source, scope, current evidence, and unresolved assumptions are visible.'
  },
  connections: {
    title: 'Make a connection that helps you reason',
    intro: 'A connection should explain an intellectual relationship you can revisit. Choose a useful direction and verb, then preserve the argument behind it. You can use your own relationship names.',
    steps: [
      { title: 'Identify the reasoning task', body: 'Ask why you are connecting these records: to support an explanation, reveal a conflict, enable a measurement, recover an influence, or plan a test. Similar vocabulary alone may not be useful.' },
      { title: 'Choose a direction and verb', body: 'Read the connection as a sentence: source → relationship → target. Useful relationships include supports, challenges, depends on, provides measurement, proposes an alternative, reframes, and inspires a test.' },
      { title: 'Write the bridge', body: 'Explain which part of the source bears on which part of the target. Include the source, assumptions, conditions, and remaining uncertainty.', example: 'The action logger may provide measurement for the strategy question because different paths could produce the same accuracy. We still need to show that the candidate strategies yield distinguishable paths.' },
      { title: 'Preserve the consequence', body: 'If the relation changed your thinking, record the earlier view, what the new link revealed, and its effect on the next action. A connected reflection or decision can hold the longer history.' },
      { title: 'Separate a suggestion from your judgment', body: 'Keep an AI-inferred or uncertain connection as Suggested until you review it. Accepting it means you consider it a useful recorded relationship; it does not establish the scientific truth of its endpoints.' },
      { title: 'Use the local graph', body: 'Open a problem or project and inspect nearby evidence, ideas, resources, and claims. Follow a path only when each step’s reason makes sense. Graph distance and node position are layout choices, not measures of scientific similarity.' }
    ],
    pitfalls: ['A chain of plausible links can still contain an unsupported inference.', 'Repeated links to the same source do not create independent evidence.', 'Keep uncertain or disagreeing relations visible rather than forcing consistency.'],
    doneWhen: 'Another reader can explain why the connection exists, what it assumes, and what it changes.'
  },
  portfolio: {
    title: 'Compare ideas and make a reversible choice',
    intro: 'Use a small set of genuine alternatives to decide where to invest attention. Value, feasibility, curiosity, training, and commitments can point in different directions. Keep those trade-offs visible.',
    steps: [
      { title: 'Choose alternatives at a useful scale', body: 'Compare a few ideas that compete for the same time or resources. If one is a six-month project and another a two-hour exercise, first identify the actual near-term choice.' },
      { title: 'Ask what success changes', body: 'For each idea, name the audience, knowledge gained, and intended contribution. A bounded replication or method check can be valuable without promising a new theory.' },
      { title: 'Inspect feasibility and advantage', body: 'Separate existing skills and access from hoped-for resources. Identify the largest scientific and execution uncertainties, and whether a small test can reduce them.' },
      { title: 'Include personal and training value', body: 'Ask what you want to learn, what repeatedly attracts you, and what fits your current responsibilities. Early exploration can be a legitimate reason to choose a project.' },
      { title: 'Make the choice explicit', body: 'Choose try now, gather evidence, pause, or set aside. Record the reason in terms of the actual trade-off, without compressing everything into an objective total score.', example: 'Pause the larger study until the cue explanations imply different predictions. First complete the smaller design comparison because it determines whether the study would be informative.' },
      { title: 'Set a revisit condition', body: 'Name new evidence, access, expertise, or a design improvement that would change the choice. Link the decision to the idea so a pause is recoverable.' }
    ],
    pitfalls: ['Novelty and impact are judgments to substantiate, not precise numbers to invent.', 'An appealing audience cannot rescue an uninterpretable test.', 'A temporary choice is not a permanent judgment about your research identity.'],
    doneWhen: 'You have a recorded choice, its reason, a next step, and a condition that could change it.'
  },
  week: {
    title: 'Plan a week around useful progress',
    intro: 'Your weekly plan is a deliberate selection of actions. It is separate from the list of active projects. Make room for reading, learning, discussion, and the rest of your actual schedule.',
    steps: [
      { title: 'Recover the open loops', body: 'Read recent project decisions and current uncertainties. Ask which issue is blocking understanding, execution, or a decision this week.' },
      { title: 'Select a feasible amount', body: 'Choose a few actions that fit your teaching, courses, commitments, and energy. Leaving a project off this week’s plan does not pause or abandon it.' },
      { title: 'Write an action and its reason', body: 'Choose something observable and bounded. Pair the task with the uncertainty it reduces or learning goal it serves.', example: 'Sketch predictions for three cue conditions so we can decide whether the attention account is separable from structure recognition.' },
      { title: 'Prepare the decision request', body: 'Before a meeting, identify where another perspective could change your choice. Bring the question, new evidence, alternatives, uncertainty, and your proposed next step.' },
      { title: 'Close the loop with an outcome', body: 'At the end of the action, note what happened and what it means. Marking Done means the action was completed; it does not mean its hypothesis was supported.' },
      { title: 'Re-plan deliberately', body: 'If an action was not completed, decide whether it still matters, needs to be smaller, or depends on something else. Keep the prior week’s record and explicitly choose what to carry forward.' }
    ],
    pitfalls: ['All active projects cannot automatically become this week’s priorities.', 'Avoid measuring progress solely by completed tasks.', 'An informative result can be that a proposed test is not yet interpretable.'],
    doneWhen: 'Each selected action fits the week and has a purpose you can explain; completed actions have an outcome to revisit.'
  },
  review: {
    title: 'Compare old questions with new knowledge',
    intro: 'A monthly review is an opportunity to change your map, not an obligation to produce a success story. Review both what you encountered and how your judgments changed.',
    steps: [
      { title: 'Separate learning from bookkeeping', body: 'Use Learned on to identify things that entered your thinking this month. Import time records when a file arrived. Historical records with unknown learning dates should remain undated, rather than appear as new learning.' },
      { title: 'Recover one durable question', body: 'Select an old problem or paused idea. Read the original motivation and bottleneck before looking for a new connection.' },
      { title: 'Inspect what changed', body: 'Review a new method, paper, capability, resource, or conversation. Ask exactly which part of the old bottleneck it might address. An interesting resemblance alone is not enough.' },
      { title: 'Record a proposed bridge', body: 'Explain the link, assumptions, and remaining gap. Use a suggestion when uncertain. Choose a small feasibility check before reopening a large project.', example: 'Action-sequence logging is now available. It could address the old measurement bottleneck, if our candidate strategies generate different sequences.' },
      { title: 'Review a judgment retrospectively', body: 'Compare what you expected with what happened. Ask whether the choice was reasonable given what you knew, what surprised you, and what you would do differently. Preserve outcomes that challenged your view.' },
      { title: 'Notice developing capabilities and interests', body: 'Look for work you can now do with less help and questions that keep attracting you. Also record interests you explored and do not want to pursue. A coherent profile can emerge gradually.' },
      { title: 'Choose the next adjustment', body: 'Record a small change in focus, a revived problem, a pause, or a learning goal. Connect relevant records. You do not need a new idea every month.' }
    ],
    pitfalls: ['Today’s import date is not evidence that you learned something today.', 'A retrospective narrative should not overwrite original notes.', 'Review effort should remain small enough to sustain.'],
    doneWhen: 'You have recovered an old question, assessed a possible new opening, and recorded what you learned about a choice or your own development.'
  },
  import: {
    title: 'Bring your research memory into the atlas',
    intro: 'You can use the downloadable agent skill to turn available notes and conversation context into a reviewable JSON file. The agent can use only memory and files it actually has access to. You choose which material to share.',
    steps: [
      { title: 'Choose the scope', body: 'Give your agent the skill and relevant notes. Say which projects, dates, or sources to include, and what to leave out. A limited, well-sourced first import is easier to check than an entire research history.' },
      { title: 'Include your existing export for updates', body: 'Give the agent a recent workspace JSON when adding to an existing atlas. Reusing record IDs lets the importer distinguish updates from new records. Similar titles with different IDs may still need manual reconciliation.' },
      { title: 'Preserve provenance and uncertainty', body: 'Ask the agent to separate source-backed facts, your interpretations, and its own suggestions; keep personal and team contributions distinct. Missing dates and sources should remain missing.' },
      { title: 'Inspect the generated file', body: 'Review especially claims, contributions, source links, dates, and inferred connections. AI-inferred relations should be Suggested. The accompanying source report should identify unavailable context and uncertain reconstructions.' },
      { title: 'Choose how to import', body: 'To append without overwriting, use Merge and keep the current version for conflicts. Merge previews changes so you can decide which version of a matching record to keep. Replace loads the incoming workspace as a whole. Export a backup before replacing anything important.' },
      { title: 'Check the resulting map', body: 'Open a few representative records and their connections. Check that historical readings did not become this month’s learning, that your weekly choices remain intentional, and that provisional claims remain qualified.' }
    ],
    pitfalls: ['An agent cannot recover conversations or files it cannot access.', 'Do not share confidential source material merely to fill fields.', 'A valid JSON file can still contain incorrect research claims; review its meaning.'],
    doneWhen: 'The imported records preserve what is known, what is inferred, and where each important claim came from.'
  },
  storage: {
    title: 'Keep your workspace between visits',
    intro: 'Research Atlas saves edits in this browser as you work. Reopening the same site in the same browser profile restores that workspace; you do not need to import a JSON file each time. A separate exported copy remains useful for recovery and moving devices.',
    steps: [
      { title: 'Use a consistent address and profile', body: 'Browser storage belongs to a site address and browser profile. A different domain, port, browser, or private window may have a separate workspace. Keep using the same address for everyday work.' },
      { title: 'Check the save state', body: 'Use the save indicator to confirm that changes reached browser storage. If saving fails, export a JSON copy before closing the page. Keeping a tab open is not the same as having a recoverable backup.' },
      { title: 'Keep a separate backup', body: 'Export a JSON copy periodically and before replacing or clearing a workspace. If file backup is available in your browser, connect a local file and check the backup status. Browser permission may need to be granted again after reopening.' },
      { title: 'Understand local scope', body: 'Clearing site data or deleting a browser profile can remove the local workspace. Browser persistence reduces accidental eviction when supported, but does not protect against manual deletion. The tool does not provide an account or cloud synchronization.' },
      { title: 'Move deliberately between devices', body: 'Export on the device with the latest work and import on the other. Review merge conflicts if both copies changed. A file in a synced folder can carry a backup, but does not create automatic collaborative editing.' }
    ],
    pitfalls: ['A JSON backup is a copy at a point in time unless file backup explicitly reports a successful update.', 'Local browser saving is not an off-device backup.', 'Do not replace your current workspace with an old file before checking which copy is newer.'],
    doneWhen: 'You can reopen your working address and recover your records, and you know where a separate recent backup is stored.'
  }
};

export const FIELD_HELP = {
  title: { meaning: 'A short cue that helps you recognize this record later.', prompt: 'What specific question, operation, or change will I search for?', example: 'Can a shared cue reveal a reusable strategy?', pitfall: '“Interesting paper” will be difficult to recover later.' },
  body: { meaning: 'Your main note in your own words. It can remain incomplete.', prompt: 'What is the thought, what triggered it, and why would I want to return?', example: 'The tasks share a rule, but equal accuracy could hide different strategies. I want to know whether an action trace could distinguish them.', pitfall: 'Keep source statements separate from your interpretation and AI suggestions.' },
  why: { meaning: 'The reason this question, idea, or attempt is worth attention.', prompt: 'If this worked, what would somebody understand or do differently?', example: 'It could clarify whether strategy reuse depends on recognizing structure or on executing a known procedure.', pitfall: '“Nobody has done this” is neither verified novelty nor a complete reason to care.' },
  trigger: { meaning: 'The event, evidence, or observation that produced a thought or changed a judgment.', prompt: 'What happened that made this seem worth considering?', example: 'While rebuilding the task, I noticed that surface cues could vary independently of the underlying rule.', pitfall: 'Describe the trigger without inventing an exact historical date.' },
  audience: { meaning: 'People whose questions or decisions a successful result would inform.', prompt: 'Who needs this answer, and what would it help them decide?', example: 'Researchers comparing explanations of when a learned strategy is reused.', pitfall: 'A broad audience is not automatically more appropriate than a small, well-defined one.' },
  advantage: { meaning: 'A demonstrated capability, accessible resource, or combination that makes the attempt feasible for you.', prompt: 'What do I already have, and what would still require learning or collaboration?', example: 'I have built a browser-task prototype; a collaborator could advise on measurement, but that arrangement is not yet confirmed.', pitfall: 'Separate access to a team resource from having personally created it.' },
  uncertainty: { meaning: 'The most consequential thing you do not yet know.', prompt: 'What prevents me from interpreting the evidence or choosing a next step?', example: 'A useful cue might improve attention without changing recognition of shared structure.', pitfall: 'Separate scientific ambiguity from practical difficulty when they imply different next actions.' },
  nextStep: { meaning: 'A bounded action and the uncertainty or decision it addresses.', prompt: 'What is the smallest feasible action that could change my judgment?', example: 'Sketch predictions for meaningful and equally salient unrelated cues; decide whether the proposed comparison separates the explanations.', pitfall: '“Run more analyses” leaves the decision purpose unstated.' },
  restart: { meaning: 'A reason to pause and a concrete condition for returning.', prompt: 'What new evidence, capability, resource, or design would make this worth reconsidering?', example: 'Return when two candidate explanations predict different action sequences under a feasible manipulation.', pitfall: '“When I have time” does not explain what would make the research more informative.' },
  evidence: { meaning: 'Inspectable work or observations supporting a scoped statement.', prompt: 'What could someone examine, and what does it actually demonstrate?', example: 'Prototype v2 records the full action sequence in scripted test trials; this demonstrates logging, not yet a cognitive effect.', pitfall: 'A source can support an observation without establishing its mechanism.' },
  contribution: { meaning: 'The work and decisions you personally carried out, distinguished from team contributions.', prompt: 'What did I design, implement, analyze, interpret, or coordinate?', example: 'I implemented and tested the action logger. A collaborator proposed the original task; the lab supplied the stimuli.', pitfall: 'Authorship or team membership alone does not establish responsibility for every part of a project.' },
  sourceUrl: { meaning: 'A verified web link to the source or inspectable artifact.', prompt: 'Where can I inspect the original evidence or work?', example: 'Paste the actual paper, repository, or artifact link; leave this blank if no verified URL is available.', pitfall: 'Do not invent a DOI or link from memory. Use Source reference for a local filename or conversation locator.' },
  learning: { meaning: 'A capability or form of judgment you want to develop through the attempt.', prompt: 'What should I be able to do or explain more independently afterward?', example: 'Translate a verbal explanation into contrasting predictions and identify a confound before data collection.', pitfall: 'Learning can be a valid outcome even when a predicted effect is not found.' },
  question: { meaning: 'What the project or source is trying to explain or establish.', prompt: 'Whose behavior, under what conditions, and which aspect is puzzling?', example: 'When do people recognize that a strategy learned in one task can be used in another?', pitfall: 'A broad topic such as “memory and AI” still needs an answerable question.' },
  explanation: { meaning: 'A candidate account connecting assumptions to an observation.', prompt: 'What process could generate the pattern, and what is an alternative?', example: 'A meaningful cue helps recognize shared structure; an alternative is that any noticeable cue increases attention.', pitfall: 'Treat a plausible explanation as a candidate until discriminating evidence supports it.' },
  prediction: { meaning: 'An observable consequence expected under specified conditions.', prompt: 'What should differ, according to which explanation, after which manipulation?', example: 'Specify how the structure-recognition and attention accounts differ between a meaningful cue and an equally salient unrelated cue; mark overlap as unresolved.', pitfall: 'If both accounts predict the same outcome, the comparison is not yet a discriminating test.' },
  claimKind: { meaning: 'The role of a statement: observation, explanation, prediction, or limitation.', prompt: 'Am I recording what was measured, why it might happen, what I expect next, or what cannot be concluded?', example: '“The paths differed” is an observation; “participants recognized the shared rule” is an explanation.', pitfall: 'Split a sentence when it silently moves from observation to mechanism.' },
  claimStatus: { meaning: 'Your current assessment: provisional, supported, or challenged.', prompt: 'Which evidence supports this scoped statement, and what could change that assessment?', example: 'Provisional: the cue may help recognize structure. Supported only after specified evidence addresses relevant alternatives.', pitfall: 'Supported does not mean certain, universal, or independently verified by the app.' },
  sourceRef: { meaning: 'A traceable locator for the source, including local files, sections, figures, or conversation notes.', prompt: 'Where exactly did this statement come from, and whose interpretation is it?', example: 'design-notes.md, “Cue comparison”; researcher’s interpretation after the design review.', pitfall: 'If the source is unavailable memory, label it as such rather than implying direct verification.' },
  sourceVersion: { meaning: 'The version of the source or analysis relevant to the statement.', prompt: 'Which document revision, commit, model, dataset, or analysis run supports this?', example: 'Task prototype v2; simulation notebook saved after the cue-control revision.', pitfall: 'Do not transfer a result from one version to another without checking.' },
  publishedOn: { meaning: 'When a source was published; this is separate from when you learned about it.', prompt: 'What publication date is supported by the source metadata?', example: 'If only a year is known, record that year and say that the exact publication date is unknown.', pitfall: 'Publication time does not determine whether something is new to your thinking.' },
  eventDate: { meaning: 'The actual date of the research event represented by the record, when known.', prompt: 'When did this reading, attempt, or change happen?', example: 'Use the date of a documented design review; leave blank if you remember only that it happened last semester.', pitfall: 'Import time and file creation time are not substitutes for a historical event date.' },
  learnedOn: { meaning: 'When this information or capability entered your thinking. Monthly review uses this date.', prompt: 'Do I know when I first encountered or learned this?', example: 'An old paper first read this month can be new learning; an old note imported this month is not automatically new learning.', pitfall: 'Leave unknown learning dates blank. Never infer them from an import timestamp.' },
  status: { meaning: 'The current stage of a record: seed, exploring, active, paused, completed, or archived.', prompt: 'Am I keeping a spark, investigating, committing work, waiting, finished, or keeping a historical record?', example: 'Completed: the logging prototype achieved its bounded objective. Paused: the larger experiment needs a distinguishing prediction.', pitfall: 'Stage describes work, not whether a scientific claim is true.' },
  tags: { meaning: 'Reusable words that help retrieve records across types.', prompt: 'Which terms would help me find this with related problems, methods, or projects?', example: 'strategy, measurement, pilot', pitfall: 'Use a few useful tags; detailed reasoning belongs in the note or connection.' },
  relation: { meaning: 'A directional verb connecting two records.', prompt: 'Can I read source → verb → target as a meaningful sentence?', example: 'Action logger → provides measurement for → strategy question.', pitfall: 'A useful relationship requires more than similar words in the two records.' },
  reason: { meaning: 'The argument for a connection, including source, assumptions, and consequences.', prompt: 'Which part of the source bears on the target, under what conditions, and why does it matter?', example: 'Paths may distinguish strategies even when final accuracy is equal; first check that the candidate strategies produce different observable paths.', pitfall: 'Accepting a connection records your judgment, not proof that the relationship is true.' },
  before: { meaning: 'The interpretation or choice before a substantive change.', prompt: 'What did I believe or plan with the information I had then?', example: 'I thought a meaningful cue alone would separate the explanations.', pitfall: 'If reconstructed from memory, say so; do not rewrite history to make the new view look inevitable.' },
  after: { meaning: 'The revised view after new evidence or feedback.', prompt: 'What exactly changed, and what remains unresolved?', example: 'Cue salience is an alternative account; a matched comparison is needed.', pitfall: 'A narrower interpretation can be progress without rejecting the whole project.' },
  action: { meaning: 'A concrete consequence of a decision or a selected weekly action.', prompt: 'What will I do, and what decision will it help?', example: 'Draw the matched cue conditions before committing to data collection.', pitfall: 'Keep the action bounded enough to evaluate later.' },
  outcome: { meaning: 'In a weekly plan, what happened and what it implies. In a decision, the choice: try now, gather evidence, pause, or set aside.', prompt: 'What did I choose, or what did the completed attempt reveal?', example: 'Decision: gather evidence first. Later plan outcome: the predictions still overlap, so a different measurement is needed.', pitfall: 'Completing an action does not imply supporting its hypothesis.' },
  changeReason: { meaning: 'The evidence or limitation behind a change in a claim’s assessment.', prompt: 'What new information justifies moving this statement from provisional to supported or challenged?', example: 'The matched cue comparison remains compatible with an attention account, so the earlier mechanism interpretation needs qualification.', pitfall: 'A status change should not erase the earlier statement or silently strengthen the conclusion.' },
  period: { meaning: 'The month covered by a retrospective review.', prompt: 'Which period am I reflecting on, regardless of when I write the note?', example: 'A September review written in early October still covers September.', pitfall: 'A review period does not supply missing learning dates for individual records.' },
  week: { meaning: 'The week you deliberately chose for an action, starting on Monday.', prompt: 'Does this action fit the responsibilities and available time of that week?', example: 'Choose one design comparison for the current week; keep the larger project active without scheduling all its work.', pitfall: 'Moving an unfinished action forward should be a new choice, not automatic accumulation.' },
  done: { meaning: 'Whether the selected action was completed.', prompt: 'Did I carry out this bounded action, and have I recorded its outcome?', example: 'The prediction sketch is done, although it showed that the current design is not yet discriminating.', pitfall: 'Done refers to the action, not the truth of a hypothesis or completion of the whole project.' },
  type: { meaning: 'The role this record plays in your research map.', prompt: 'Am I keeping a durable question, a proposed approach, a source, evidence of ability, an attempt, or a change in thinking?', example: 'Keep the durable strategy question as a Problem and the proposed cue comparison as an Idea or Project.', pitfall: 'You can begin with an imperfect classification. Split records later if they mix different roles.' },
  nodeId: { meaning: 'The record whose context this decision, review, or plan belongs to.', prompt: 'Where should I be able to recover this later?', example: 'Attach a decision about cue salience to the cue-comparison project.', pitfall: 'A general reflection may stand alone; a weekly action should have a specific research context.' },
  source: { meaning: 'The starting record in a directional relationship.', prompt: 'Which record provides the evidence, method, influence, or requirement?', example: 'Action logger → provides measurement for → strategy question.', pitfall: 'Read the whole sentence to check the direction before saving.' },
  target: { meaning: 'The record affected by the directional relationship.', prompt: 'Which question, claim, idea, or project does the source bear on?', example: 'A limitation → challenges → a mechanism claim.', pitfall: 'Direction expresses the relation you name; it does not automatically imply a causal effect.' },
  provenance: { meaning: 'Whose account or interpretation this is and how it was obtained.', prompt: 'Did I inspect a source, record the researcher’s account, or receive an AI suggestion?', example: 'Researcher interpretation of design-review notes; underlying analysis has not been independently checked.', pitfall: 'A fluent summary should not make its source or uncertainty less visible.' },
  importedAt: { meaning: 'Bookkeeping time when this record entered the application through import.', prompt: 'Use this to trace an import; use Event date and Learned on for the research timeline.', example: 'A reading from a previous year can be imported today while its learning date remains historical or unknown.', pitfall: 'Import time is never evidence of publication time, discovery, or recent learning.' },
  edgeStatus: { meaning: 'Whether a relationship is a suggestion awaiting review or a judgment you have accepted into your map.', prompt: 'Have I inspected the reason and accepted this connection myself?', example: 'Keep an AI-proposed link between action logging and strategy measurement as Suggested until you assess its assumptions.', pitfall: 'Accepting a relationship does not certify that its scientific content is true.' },
  focusIds: { meaning: 'The few records you deliberately choose to keep on your research desk.', prompt: 'What do I want to return to when I reopen my workspace?', example: 'Focus on the cue-comparison project and the measurement problem while other projects remain active.', pitfall: 'A focus item is neither an automatic task nor a permanent priority.' }
};
