// Rules that must hold for every sentence, not just the checked ones in
// test/corpus/. Each line of test/stress-sentences.txt is built and checked:
//
//   - no English-only word is signed (TO, AT, FOR, THAN, OF, IS, THE, ...)
//   - every English word is either signed or dropped by a named rule
//   - time signs open the sentence
//   - in a WH question the question word comes last
//   - the subject comes before its verb
//   - a sign the dictionary lacks is still a real English base word (not MOVY)
//
//   node test/grammar-invariants.test.mjs           stop with a count
//   node test/grammar-invariants.test.mjs --list    print every failure
import fs from 'node:fs';
import { buildSentence, glossLine, makeLexicon } from '../src/grammar.js';
import * as W from '../src/grammar-words.js';

const here = (p) => new URL(p, import.meta.url);
const labels = JSON.parse(fs.readFileSync(here('../data/signs.json'))).entries.map((e) => e.label);
let nid = [];
try { nid = JSON.parse(fs.readFileSync(here('../data/nid/all-free.json'))).map((e) => e.label); } catch { /* no NID index */ }
const lex = makeLexicon(labels);
const known = makeLexicon([...labels, ...nid]);
const list = process.argv.includes('--list');

const sentences = fs.readFileSync(here('stress-sentences.txt'), 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

// English words with no SASL sign of their own: grammar the hands or face carry instead
const NEVER_SIGNED = new Set(`THE A AN IS ARE AM WAS WERE BE BEEN BEING DOES DID WILL WOULD SHALL
  TO OF THAN AT BY INTO ONTO`.split(/\s+/));
const englishWord = (w) => {
  const x = w.toLowerCase();
  return W.VERBS.has(x) || W.ADJECTIVES.has(x) || W.COMMON.has(x) || W.PLACES.has(x) || W.TIME_NOUNS.has(x)
    || W.PLACE_NAMES.has(x) || x in W.NUMBERS || W.DAYS.includes(x) || W.MONTHS.includes(x) || !!known.find(w);
};

function check(text) {
  const s = buildSentence(text, lex);
  const bad = [];
  const signs = s.signs;
  for (const x of signs) {
    if (NEVER_SIGNED.has(x.gloss) || x.gloss === 'DO' && x.role !== 'verb') bad.push(`signs ${x.gloss}`);
    if (x.state === 'missing') {
      for (const w of x.gloss.split(/[ -]/)) if (w && !/^\d/.test(w) && !englishWord(w)) bad.push(`not a word: ${x.gloss}`);
    }
  }
  for (const w of s.words) if (!w.punct && w.drop === 'kept') bad.push(`"${w.text}" left unexplained`);
  // time opens the sentence (after a greeting); a second clause may set its own time
  const body = signs.filter((x) => x.role !== 'greeting');
  const oneClause = s.clauses === 1 && !body.some((x) => x.role === 'link');
  if (oneClause) {
    const firstOther = body.findIndex((x) => x.role !== 'time');
    if (firstOther >= 0 && body.slice(firstOther).some((x) => x.role === 'time')) bad.push('time not first');
  }
  if (s.kind === 'wh' && body.at(-1)?.role !== 'question') bad.push('question word not last');
  if (oneClause) {
    const subj = body.findIndex((x) => x.role === 'subject');
    const verb = body.findIndex((x) => x.role === 'verb' && x.kind !== 'describe');
    if (subj >= 0 && verb >= 0 && verb < subj) bad.push('verb before its subject');
  }
  return { s, bad };
}

let failed = 0;
const tally = {};
for (const text of sentences) {
  const { s, bad } = check(text);
  if (!bad.length) continue;
  failed++;
  for (const b of bad) { const k = b.replace(/".*"|: .*| [A-Z']+$/, '').trim(); tally[k] = (tally[k] || 0) + 1; }
  if (list) console.log(`${text}\n   ${glossLine(s)}\n   ✗ ${bad.join('; ')}`);
}
console.log(`grammar invariants: ${sentences.length - failed} of ${sentences.length} sentences pass`);
if (failed) {
  console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${n} × ${k}`).join('\n'));
  process.exitCode = 1;
}
