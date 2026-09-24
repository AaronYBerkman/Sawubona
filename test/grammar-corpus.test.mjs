// The sentence builder against every checked case in test/corpus/*.json.
//
// Each case is one English sentence (or, with "para": true, a paragraph) and
// what the builder must say about it. Only "en" and "gloss" are required:
//
//   {
//     "en": "Yesterday I went to the shop.",
//     "gloss": "YESTERDAY SHOP ME GO",          // glossLine, exactly (an array of lines for a paragraph)
//     "alt": "YESTERDAY ME GO SHOP",            // the "also common" order, or null for none
//     "kind": "statement",                      // statement | wh | yn | command
//     "roles": ["time", "place", "subject", "verb"],   // one per sign
//     "marks": [{ "kind": "neg", "over": "DON'T LIKE" }],   // every mark, and the signs under it
//     "rules": ["time", "place"],               // must all be cited
//     "drops": { "to": "place", "the": "articles" },   // English word -> the rule that drops it
//     "english": "Yesterday I went to the shop.",      // toEnglish of the gloss (Understand me)
//     "why": "time first; place early"          // for the reader of the corpus
//   }
//
// Every case runs twice: against today's dictionary (data/signs.json) and
// against it plus every NID free-tier word, so a bigger dictionary cannot
// quietly change an answer. A case that genuinely depends on the dictionary
// gives "gloss": { "now": ..., "full": ... }.
//
//   node test/grammar-corpus.test.mjs            all cases, stop with a count
//   node test/grammar-corpus.test.mjs --list     print every failure in full
//   node test/grammar-corpus.test.mjs <file>     only test/corpus/<file>.json
import fs from 'node:fs';
import { buildParagraph, buildSentence, glossLine, makeLexicon, RULES } from '../src/grammar.js';
import { toEnglish } from '../src/interpret.js';

const here = (p) => new URL(p, import.meta.url);
const now = JSON.parse(fs.readFileSync(here('../data/signs.json'))).entries.map((e) => e.label);
let nid = [];
try { nid = JSON.parse(fs.readFileSync(here('../data/nid/all-free.json'))).map((e) => e.label); } catch { /* no NID index */ }
const LEXICONS = { now: makeLexicon(now), full: makeLexicon([...new Set([...now, ...nid])]) };

const args = process.argv.slice(2);
const list = args.includes('--list');
const only = args.find((a) => !a.startsWith('--'));
const dir = here('corpus/');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!only || f === `${only}.json` || f === only));

const alt = (s) => (s.alt ? glossLine({ signs: s.alt.map((i) => s.signs[i]) }) : null);
const over = (s, m) => s.signs.slice(m.from, m.to + 1).map((x) => x.gloss).join(' ');
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function check(c, lexName, lex) {
  const bad = [];
  const want = (v) => (v && typeof v === 'object' && !Array.isArray(v) && ('now' in v || 'full' in v) ? v[lexName] : v);
  const sentences = c.para ? buildParagraph(c.en, lex) : [buildSentence(c.en, lex)];
  const lines = sentences.map(glossLine);
  const gloss = want(c.gloss);
  if (c.para) {
    if (JSON.stringify(lines) !== JSON.stringify(gloss)) bad.push(`gloss ${JSON.stringify(lines)} ≠ ${JSON.stringify(gloss)}`);
  } else if (lines[0] !== gloss) bad.push(`gloss "${lines[0]}" ≠ "${gloss}"`);
  const s = sentences[0];
  if (!c.para) {
    if ('alt' in c && alt(s) !== want(c.alt)) bad.push(`alt "${alt(s)}" ≠ "${want(c.alt)}"`);
    if (c.kind && s.kind !== c.kind) bad.push(`kind ${s.kind} ≠ ${c.kind}`);
    if (c.roles) {
      const roles = s.signs.map((x) => x.role);
      if (JSON.stringify(roles) !== JSON.stringify(c.roles)) bad.push(`roles ${roles.join(',')} ≠ ${c.roles.join(',')}`);
    }
    if (c.marks) {
      const got = s.marks.map((m) => `${m.kind}:${over(s, m)}`);
      const exp = c.marks.map((m) => `${m.kind}:${m.over}`);
      if (!sameSet(got, exp)) bad.push(`marks [${got.join(' | ')}] ≠ [${exp.join(' | ')}]`);
    }
    if (c.drops) {
      for (const [word, rule] of Object.entries(c.drops)) {
        const w = s.words.find((x) => x.text.toLowerCase() === word.toLowerCase());
        if (!w) bad.push(`no word "${word}"`);
        else if (w.drop !== rule) bad.push(`"${word}" dropped by ${w.drop ?? '(signed)'} ≠ ${rule}`);
      }
    }
    if (c.english) {
      // a fingerspelled name reaches Understand me as its letters (T-H-A-B-O), as in the gloss line
      const e = toEnglish(s.signs.map((x) => (x.spell ? glossLine({ signs: [x] }) : x.gloss))).english;
      if (e !== want(c.english)) bad.push(`english "${e}" ≠ "${want(c.english)}"`);
    }
  }
  if (c.rules) {
    const cited = sentences.flatMap((x) => x.rules);
    for (const r of c.rules) if (!cited.includes(r)) bad.push(`rule ${r} not cited (cited: ${[...new Set(cited)].join(',')})`);
  }
  for (const x of sentences) {
    for (const r of x.rules) if (!RULES[r]) bad.push(`cites unknown rule ${r}`);
    // every English word is either signed, dropped with a reason, or punctuation
    for (const w of x.words) {
      if (w.sign == null && !w.drop && !w.punct && /\w/.test(w.text)) bad.push(`"${w.text}" is neither signed nor explained`);
      if (w.drop && !RULES[w.drop]) bad.push(`"${w.text}" dropped by unknown rule ${w.drop}`);
    }
  }
  return bad;
}

let total = 0;
let failed = 0;
const report = [];
for (const f of files) {
  const cases = JSON.parse(fs.readFileSync(new URL(f, dir)));
  for (const c of cases) {
    total++;
    const bad = [];
    for (const [name, lex] of Object.entries(LEXICONS)) {
      let found;
      try { found = check(c, name, lex); } catch (e) { found = [`crashed: ${e.message.split('\n')[0]}`]; }
      for (const b of found) bad.push(`[${name}] ${b}`);
    }
    // the same complaint from both dictionaries is one complaint
    const uniq = [...new Set(bad.map((b) => b.replace(/^\[(now|full)\] /, '')))].map((b) =>
      (bad.filter((x) => x.endsWith(b)).length === 2 ? b : bad.find((x) => x.endsWith(b))));
    if (uniq.length) {
      failed++;
      report.push(`${f}: ${c.en}\n    ${uniq.join('\n    ')}`);
    }
  }
}
if (list || failed <= 15) for (const r of report) console.log(r);
else for (const r of report.slice(0, 15)) console.log(r);
if (!list && failed > 15) console.log(`… and ${failed - 15} more (--list for all)`);
console.log(`grammar corpus: ${total - failed} of ${total} cases pass (${files.length} files)`);
if (failed) process.exit(1);
