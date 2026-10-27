// Rules every built sentence must keep, whatever the English. buildSentence
// runs them on its own output, and a sentence that breaks one is marked
// "unsupported" with the reason, so the learner sees a warning rather than a
// confident wrong order. test/grammar-invariants.test.mjs runs the same rules.

// English words with no SASL sign of their own: the hands, the face and the order do their job
export const NEVER_SIGNED = new Set(`THE A AN IS ARE AM WAS WERE BE BEEN BEING DOES DID WILL WOULD SHALL
  TO OF THAN AT BY INTO ONTO`.split(/\s+/));

/** Reasons the sign order breaks a rule; empty when it keeps them all. */
export function orderProblems(sentence) {
  const out = [];
  const signs = sentence.signs.filter((x) => x.role !== 'greeting');
  for (const x of signs) {
    if (NEVER_SIGNED.has(x.gloss) || x.gloss === 'DO' && x.role !== 'verb') out.push(`"${x.gloss.toLowerCase()}" has no sign of its own but was kept.`);
  }
  if (sentence.kind === 'wh' && signs.length && signs.at(-1).role !== 'question') out.push('The question word did not end up last.');
  // with one clause: time first, and who before the action
  if (sentence.clauses === 1 && !signs.some((x) => x.role === 'link')) {
    const firstOther = signs.findIndex((x) => x.role !== 'time');
    if (firstOther >= 0 && signs.slice(firstOther).some((x) => x.role === 'time')) out.push('A time sign did not end up first.');
    const subj = signs.findIndex((x) => x.role === 'subject');
    const verb = signs.findIndex((x) => x.role === 'verb' && x.kind !== 'describe');
    if (subj >= 0 && verb >= 0 && verb < subj) out.push('The action came before who does it.');
  }
  return out;
}
