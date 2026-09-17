export const guides = {
  'research-path': {
    title:'From a question to a worthwhile next test',
    intro:'You do not need a finished research identity to begin. Start with one observation that puzzles you. The purpose is to make your reasoning recoverable, including the judgments that later change.',
    steps:[
      {title:'1. Why is this question worth doing?',body:'Name an observation, a tension between explanations, or a decision that existing knowledge cannot resolve. Who would learn something if you answered it? What would an answer change? A personal interest is a good starting point; scientific value is something to investigate.',example:'Two people reach the same answer by different routes. Does final accuracy hide different strategies? A useful answer could change what we measure.'},
      {title:'2. What exactly is the bottleneck?',body:'Finish the sentence: I cannot make progress yet because ___. Is the limit missing data, measurement, computational cost, background knowledge, access, or two explanations making the same prediction? State what would count as removing that limit.',example:'I can measure the final answer, but not the intermediate choices needed to distinguish the two accounts.'},
      {title:'3. What condition has changed?',body:'Record a specific method, dataset, course, talk, conversation, or new collaborator. Include when you learned about it, where the claim comes from, and what you can actually use. New to you is different from newly published.',example:'A methods class introduced a way to record action sequences. I have only tested a toy example; participant data are not yet available.'},
      {title:'4. Why could the new connection help?',body:'Connect the method or resource to the blocked question and explain the bridge: it provides measurement X, reduces cost Y, or permits contrast Z. Check its assumptions. Similar wording alone is not a reason. Mark AI-proposed connections as Suggested until you evaluate them.',example:'Sequence logging could expose different routes despite equal accuracy, provided the candidate strategies actually predict distinguishable sequences.'},
      {title:'5. What is the next informative test?',body:'Choose the smallest step that could change your judgment. Write what each plausible result would imply. A literature search, simulation, or conversation may be the right next test. Record why you proceed, gather evidence, pause, or set aside.',example:'Simulate both accounts on ten toy trials. If their observable sequences overlap, first revise the measurement; if they separate, evaluate a pilot design.'},
    ],
    pitfalls:['An AI-generated explanation is not a finding. Keep observation, interpretation, and prediction separate.','Lack of novelty, lack of feasibility, and lack of personal interest are different reasons to reconsider.','A small negative result can improve your judgment even when it does not produce a project.'],
    doneWhen:'A future you can recover why the question mattered, what blocked it, what changed, and what result would affect your next choice.'
  },
  storage: {
    title:'Keep a recoverable workspace in your vault',
    intro:'All Atlas records, connections, decisions, reviews, and weekly plans are saved together in workspace.json. There is no browser-only working copy or plugin account.',
    steps:[
      {title:'Check the save indicator',body:'Wait for Saved in vault. Saving to vault means a write is still pending. If a write fails, export the current view before closing it.'},
      {title:'Know your files',body:'The plugin uses your configured folder: workspace.json is the editable Atlas data, Backups contains copies from before session edits, and Exports contains deliberate JSON and Markdown snapshots.'},
      {title:'Use normal vault backups',body:'Include the Atlas folder in your existing backup or sync workflow. Local copies in the same vault do not protect against losing that vault. The plugin itself does not contact a cloud service.'},
      {title:'Handle conflicting edits',body:'If the file changes outside this view, saving stops rather than overwriting it. Export this view, reopen the vault copy, then import the export and resolve the merge preview.'},
      {title:'Move between web and plugin',body:'Export JSON and import it into the other version. Review conflicts if both have changed. Linked Markdown snapshots are for reading and backlinks; their edits do not automatically change Atlas data.'},
    ],pitfalls:['Never use an older snapshot to replace current work without reviewing it.','Multi-device file sync is not live collaboration.','Keep the JSON file for complete round trips; Markdown snapshots are not a second editable database.'],
    doneWhen:'You know where the saved JSON and independent backups are, and can recover your complete workspace.'
  }
};
export const fields = {
  bottleneck:{meaning:'The specific obstacle preventing progress, not a general feeling of difficulty.',prompt:'What can I not yet observe, distinguish, compute, access, or explain?',example:'Final accuracy cannot distinguish two strategies; intermediate choices are unobserved.',pitfall:'Separate a scientific ambiguity from a scheduling problem. An unknown bottleneck is worth investigating.'},
  changedConditions:{meaning:'A concrete change in what is known or possible.',prompt:'Which new method, data, course, conversation, or collaborator changes an earlier constraint?',example:'I learned a method for logging intermediate actions, but have not checked its validity in this task.',pitfall:'Access, reliability, and applicability still need checking. New does not automatically mean useful.'},
  connectionBasis:{meaning:'The argument connecting the changed condition to the bottleneck.',prompt:'How exactly might this help, under what assumptions, and what evidence is missing?',example:'Action traces might separate the candidate strategies if they predict different observable paths.',pitfall:'Similarity is a retrieval clue, not scientific justification. Keep unreviewed AI links suggested.'},
  vaultNote:{meaning:'The vault-relative path of a linked Obsidian Markdown note.',prompt:'Use Link a vault note in the inspector to select the relevant source.',example:'Reading/Strategy measurement.md',pitfall:'Links reference a note; they do not import its contents or synchronize edits. Relink after moving or renaming the note.'}
};
