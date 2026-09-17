import {validateWorkspace} from '../vendor/atlas/model.js';
import {safeName} from './vault-store.mjs';

export function markdownSnapshot(input) {
  const workspace=validateWorkspace(input);
  const names=new Map(workspace.nodes.map((n,i)=>[n.id,`${String(i+1).padStart(3,'0')} ${safeName(n.title)}.md`]));
  const link=id=>names.has(id)?`[[${names.get(id).slice(0,-3)}]]`:'Workspace';
  const files=[];
  for (const n of workspace.nodes) {
    const related=workspace.edges.filter(e=>e.source===n.id||e.target===n.id);
    const decisions=workspace.decisions.filter(d=>d.nodeId===n.id);
    const reviews=workspace.reviews.filter(r=>r.nodeId===n.id);
    const plans=workspace.plans.filter(p=>p.nodeId===n.id);
    const text=`---\natlas_id: ${JSON.stringify(n.id)}\natlas_type: ${JSON.stringify(n.type)}\natlas_status: ${JSON.stringify(n.status)}\natlas_snapshot: true\n---\n\n# ${n.title}\n\n> Readable snapshot. Edit research data in Research Atlas; import workspace.json for a complete round trip.\n\n${n.body}\n\n${Object.entries(n.fields).filter(([,v])=>v).map(([k,v])=>`## ${k}\n\n${v}`).join('\n\n')}\n\n## Dates\n\nCreated: ${n.createdAt}\nUpdated: ${n.updatedAt}\nEvent: ${n.eventDate || 'Unknown'}\nLearned: ${n.learnedOn || 'Unknown'}\nImported: ${n.importedAt || 'Not imported'}\n\n## Connections\n\n${related.map(e=>`- ${link(e.source)} → **${e.relation}** → ${link(e.target)} (${e.status})\n  ${e.reason}`).join('\n')}\n\n## Judgment history\n\n${decisions.map(d=>`### ${d.title}\n${d.createdAt}\n\nBefore: ${d.before}\n\nTrigger: ${d.trigger}\n\nNow: ${d.after}\n\n${d.body}\n\nDecision: ${d.outcome}\n\nNext: ${d.action}`).join('\n\n')}\n\n## Reviews\n\n${reviews.map(r=>`### ${r.title} (${r.period})\n\n${r.body}`).join('\n\n')}\n\n## Weekly plans\n\n${plans.map(p=>`- [${p.done?'x':' '}] ${p.week}: ${p.action}\n  Why: ${p.why}\n  Outcome: ${p.outcome}`).join('\n')}\n`;
    files.push({name:names.get(n.id),text});
  }
  files.push({name:'Atlas index.md',text:`# ${workspace.name}\n\nSnapshot of the complete Research Atlas workspace. The accompanying workspace.json preserves all records and IDs for reimport. Markdown edits do not update the workspace.\n\n## Research records\n\n${workspace.nodes.map(n=>`- ${link(n.id)} · ${n.type} · ${n.status}`).join('\n')}\n\n## Workspace decisions\n\n${workspace.decisions.filter(d=>!d.nodeId).map(d=>`### ${d.title}\n\nBefore: ${d.before}\n\nTrigger: ${d.trigger}\n\nNow: ${d.after}\n\n${d.body}\n\nNext: ${d.action}`).join('\n\n')}\n\n## Workspace reviews\n\n${workspace.reviews.filter(r=>!r.nodeId).map(r=>`### ${r.title} (${r.period})\n\n${r.body}`).join('\n\n')}\n`});
  files.push({name:'workspace.json',text:JSON.stringify(workspace,null,2)});
  return files;
}
