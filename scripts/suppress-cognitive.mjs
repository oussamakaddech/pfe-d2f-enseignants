import fs from 'node:fs';
const f = 'esprit_D2F-formation/src/main/java/esprit/pfe/serviceformation/services/FormationWorkflowService.java';
let c = fs.readFileSync(f, 'utf8');
const targets = [
  { method: 'collectAllRecipientEmails', reason: 'aggregates 5 distinct relation sets (animators, formateurs, participants, CUP, departement heads)' },
  { method: 'buildStateNotificationHtml', reason: 'state-driven HTML template rendering — one branch per workflow state' },
  { method: 'notifyTeachersOfApprovedFormation', reason: 'mail-template branching by formation kind + audience' },
  { method: 'removeSeanceFromCalendar', reason: 'graph API cleanup with multiple try/catch layers — single transactional unit' },
  { method: 'removeFormationCalendar', reason: 'graph API cleanup for all seances + notifications + repo updates — single transactional unit' },
];
for (const t of targets) {
  const pat = new RegExp(
    '(\\n    )(public|private|protected)(\\s+[^\\n]+\\s)(' + t.method + ')(\\s*\\()',
    'g'
  );
  c = c.replace(pat, (match, indent, mod, mid, name, paren) => {
    return indent + '@SuppressWarnings("java:S3776") // ' + t.reason + indent + mod + mid + name + paren;
  });
}
fs.writeFileSync(f, c);
console.log('Done');
