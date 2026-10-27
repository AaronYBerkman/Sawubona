// Thousands of sentences built from known parts, each checked against the
// sign order those parts must give. Where test/corpus/ checks sentences one at
// a time, this checks the rules across every combination of subject, verb,
// object, time, place, negative, modal and question.
//
// The expected order follows the rules in src/grammar.js RULES, with their sources:
//   time first, then place, then who (Real SASL time and indexing lessons)
//   who, the action, then what (Wehrmeyer 2025); HAVE and LIKE last (objFirst)
//   the thing, then colour, size, how many (Real SASL adjective lesson)
//   NOT / CAN'T after the action (De Barros & Siebörger 2016; Wright 2017)
//   the question word last (Real SASL questions lesson)
//
//   node test/grammar-generated.test.mjs           stop with a count
//   node test/grammar-generated.test.mjs --list    print every failure
import fs from 'node:fs';
import { buildSentence, glossLine, makeLexicon } from '../src/grammar.js';

const labels = JSON.parse(fs.readFileSync(new URL('../data/signs.json', import.meta.url))).entries.map((e) => e.label);
const lex = makeLexicon(labels);
const list = process.argv.includes('--list');

// who: English, gloss, verb agreement (3 = he/she/it), "do" form
const SUBJECTS = [
  { en: 'I', g: 'ME', p: 1 }, { en: 'you', g: 'YOU', p: 2 }, { en: 'we', g: 'WE', p: 1 },
  { en: 'they', g: 'THEY', p: 1 }, { en: 'she', g: 'SHE', p: 3 }, { en: 'he', g: 'HE', p: 3 },
  { en: 'my mother', g: 'MY MOTHER', p: 3 }, { en: 'the teacher', g: 'TEACHER', p: 3 },
  { en: 'Thabo', g: 'T-H-A-B-O', p: 3 }, { en: 'my friends', g: 'MY FRIEND', p: 1 },
];
// plain verbs: base, -s form, past, gloss
const VERBS = [
  ['eat', 'eats', 'ate'], ['drink', 'drinks', 'drank'], ['buy', 'buys', 'bought'], ['read', 'reads', 'read'],
  ['cook', 'cooks', 'cooked'], ['wash', 'washes', 'washed'], ['clean', 'cleans', 'cleaned'], ['sell', 'sells', 'sold'],
  ['want', 'wants', 'wanted'], ['need', 'needs', 'needed'], ['love', 'loves', 'loved'], ['find', 'finds', 'found'],
  ['open', 'opens', 'opened'], ['make', 'makes', 'made'], ['watch', 'watches', 'watched'], ['lose', 'loses', 'lost'],
].map(([base, s, past]) => ({ base, s, past, g: base.toUpperCase() }));
// HAVE and LIKE: the thing comes first
const LAST_VERBS = [{ base: 'have', s: 'has', past: 'had', g: 'HAVE' }, { base: 'like', s: 'likes', past: 'liked', g: 'LIKE' }];
// what: English, gloss (noun, then colour, then size, then how many)
const OBJECTS = [
  { en: 'bread', g: 'BREAD' }, { en: 'the apple', g: 'APPLE' }, { en: 'a book', g: 'BOOK' },
  { en: 'my car', g: 'MY CAR' }, { en: 'water', g: 'WATER' }, { en: 'the red ball', g: 'BALL RED' },
  { en: 'two dogs', g: 'DOG TWO' }, { en: 'a new phone', g: 'PHONE NEW' }, { en: 'three big houses', g: 'HOUSE BIG THREE' },
  { en: 'the white shirt', g: 'SHIRT WHITE' },
];
const TIMES = {
  past: [{ en: 'yesterday', g: 'YESTERDAY' }, { en: 'last week', g: 'LAST WEEK' }, { en: 'on Monday', g: 'MONDAY' }],
  future: [{ en: 'tomorrow', g: 'TOMORROW' }, { en: 'next year', g: 'NEXT YEAR' }],
  present: [{ en: 'every day', g: 'EVERY DAY' }, { en: 'today', g: 'TODAY' }, { en: 'in the morning', g: 'MORNING' }],
};
const PLACES = [{ en: 'at home', g: 'HOME' }, { en: 'at school', g: 'SCHOOL' }, { en: 'at the shop', g: 'SHOP' }];

// a negative SASL has its own sign for replaces the verb and NOT (rule negSign)
const negOf = (v) => (lex.find(`DON'T ${v.g}`) ? [`DON'T ${v.g}`] : [v.g]);
const notOf = (v) => (lex.find(`DON'T ${v.g}`) ? null : 'NOT');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const doOf = (s, tense) => (tense === 'past' ? 'did' : s.p === 3 ? 'does' : 'do');
const verbFor = (s, v, tense) => (tense === 'past' ? v.past : tense === 'future' ? `will ${v.base}` : s.p === 3 ? v.s : v.base);
const join = (...xs) => xs.flat().filter(Boolean).join(' ');

const cases = [];
const add = (en, gloss, why) => cases.push({ en, gloss, why });
let n = 0;
const pick = (arr, k) => arr[(k * 7 + n) % arr.length];

for (const s of SUBJECTS) {
  for (const v of [...VERBS, ...LAST_VERBS]) {
    n++;
    const last = LAST_VERBS.includes(v);
    const o = pick(OBJECTS, 1);
    const vo = (verb) => (last ? [o.g, verb] : [verb, o.g]);
    // present, with and without a time; time first
    add(`${cap(s.en)} ${verbFor(s, v, 'present')} ${o.en}.`, join(s.g, vo(v.g)), 'statement');
    const tp = pick(TIMES.present, 2);
    add(`${cap(s.en)} ${verbFor(s, v, 'present')} ${o.en} ${tp.en}.`, join(tp.g, s.g, vo(v.g)), 'time at the end moves first');
    // past and future: a time word sets the tense; without one PAST or FUTURE is added
    const t = pick(TIMES.past, 3);
    add(`${cap(t.en)} ${s.en} ${verbFor(s, v, 'past')} ${o.en}.`, join(t.g, s.g, vo(v.g)), 'past with a time word');
    // "read" is spelled the same in the past, so English alone cannot say it is past
    if (v.past !== v.base) add(`${cap(s.en)} ${verbFor(s, v, 'past')} ${o.en}.`, join('PAST', s.g, vo(v.g)), 'past, PAST added');
    const f = pick(TIMES.future, 4);
    add(`${cap(s.en)} ${verbFor(s, v, 'future')} ${o.en} ${f.en}.`, join(f.g, s.g, vo(v.g)), 'future with a time word');
    // place early
    const pl = pick(PLACES, 5);
    if (!last) add(`${cap(s.en)} ${verbFor(s, v, 'present')} ${o.en} ${pl.en}.`, join(pl.g, s.g, vo(v.g)), 'place early');
    // negative: NOT after the action (DON'T LIKE / DON'T HAVE are one sign)
    if (!last) {
      add(`${cap(s.en)} ${doOf(s, 'present')}n't ${v.base} ${o.en}.`, join(s.g, negOf(v), o.g, notOf(v)), 'negative');
      add(`${cap(s.en)} didn't ${v.base} ${o.en} yesterday.`, join('YESTERDAY', s.g, negOf(v), o.g, notOf(v)), 'past negative');
      // modals
      add(`${cap(s.en)} can ${v.base} ${o.en}.`, join(s.g, 'CAN', v.g, o.g), 'CAN before the action');
      add(`${cap(s.en)} can't ${v.base} ${o.en}.`, join(s.g, v.g, o.g, "CAN'T"), "CAN'T last");
    }
    // questions: yes/no keeps the order; the question word goes last
    if (s.en !== 'I') {
      add(`${cap(doOf(s, 'present'))} ${s.en} ${v.base} ${o.en}?`, join(s.g, vo(v.g)), 'yes/no question');
      add(`What ${doOf(s, 'past')} ${s.en} ${v.base} yesterday?`, join('YESTERDAY', s.g, v.g, 'WHAT'), 'WH last');
    }
  }
  // intransitive with place and time
  for (const [base, third, past] of [['work', 'works', 'worked'], ['sleep', 'sleeps', 'slept'], ['study', 'studies', 'studied']]) {
    n++;
    const pl = pick(PLACES, 6);
    const t = pick(TIMES.past, 7);
    add(`${cap(s.en)} ${s.p === 3 ? third : base} ${pl.en}.`, join(pl.g, s.g, base.toUpperCase()), 'place, who, action');
    add(`${cap(t.en)} ${s.en} ${past} ${pl.en}.`, join(t.g, pl.g, s.g, base.toUpperCase()), 'time, place, who, action');
    if (s.en !== 'I') add(`Where ${doOf(s, 'present')} ${s.en} ${base}?`, join(s.g, base.toUpperCase(), 'WHERE'), 'WHERE last');
  }
  // describing: no "to be", the thing then its description
  n++;
  for (const [adj, g] of [['happy', 'HAPPY'], ['tired', 'TIRED'], ['sick', 'SICK']]) {
    const be = s.en === 'I' ? 'am' : s.p === 3 ? 'is' : 'are';
    add(`${cap(s.en)} ${be} ${adj}.`, join(s.g, g), 'no "to be"');
    add(`${cap(s.en)} ${be} not ${adj}.`, join(s.g, g, 'NOT'), 'NOT after');
    add(`Yesterday ${s.en} ${s.en === 'I' ? 'was' : s.p === 3 ? 'was' : 'were'} ${adj}.`, join('YESTERDAY', s.g, g), 'time first');
  }
}

// ------------------------------------------------------------ harder shapes
const PEOPLE = SUBJECTS.filter((x) => !['I', 'you', 'we', 'they', 'she', 'he'].includes(x.en));
const be = (s) => (s.en === 'I' ? 'am' : s.p === 3 ? 'is' : 'are');
const have = (s) => (s.p === 3 ? 'has' : 'have');
const PLAIN = VERBS.filter((v) => !['want', 'need', 'love'].includes(v.base));
n = 0;
for (const s of SUBJECTS) {
  n++;
  const v = pick(PLAIN, 1), o = pick(OBJECTS, 2), v2 = pick(PLAIN, 3), o2 = pick(OBJECTS, 4);
  const other = pick(PEOPLE.filter((x) => x !== s), 5);
  // two verbs: the helper right before the action, then the thing (Wright 2017: TRY LEARN)
  for (const [h, h3, hg] of [['want', 'wants', 'WANT'], ['need', 'needs', 'NEED'], ['try', 'tries', 'TRY'], ['like', 'likes', 'LIKE']]) {
    add(`${cap(s.en)} ${s.p === 3 ? h3 : h} to ${v.base} ${o.en}.`, join(s.g, hg, v.g, o.g), 'helper then action');
  }
  add(`${cap(s.en)} wanted to ${v.base} ${o.en}.`, join('PAST', s.g, 'WANT', v.g, o.g), 'past helper');
  // verbs that move between people come last, after who and what (Real SASL directional verbs)
  for (const [base, past, g] of [['give', 'gave', 'GIVE'], ['send', 'sent', 'SEND'], ['show', 'showed', 'SHOW']]) {
    if (other) add(`${cap(s.en)} ${past} ${other.en} ${o.en}.`, join('PAST', s.g, other.g, o.g, g), 'directional last');
  }
  // a second idea after THINK / HOPE keeps its own order
  if (other) {
    add(`${cap(s.en)} ${s.p === 3 ? 'thinks' : 'think'} ${other.en} is tired.`, join(s.g, 'THINK', other.g, 'TIRED'), 'think + clause');
    add(`${cap(s.en)} ${s.p === 3 ? 'hopes' : 'hope'} ${other.en} ${other.p === 3 ? v.s : v.base} ${o.en}.`, join(s.g, 'HOPE', other.g, v.g, o.g), 'hope + clause');
    // comparing: the other side, then who, the quality, MORE (Wright 2017)
    add(`${cap(s.en)} ${be(s)} taller than ${other.en}.`, join(other.g, s.g, 'TALL', 'MORE'), 'comparison');
    // two clauses joined by AND or BUT, each in its own order
    add(`${cap(s.en)} ${s.p === 3 ? v.s : v.base} ${o.en} and ${other.en} ${other.p === 3 ? v2.s : v2.base} ${o2.en}.`,
      join(s.g, v.g, o.g, 'AND', other.g, v2.g, o2.g), 'two clauses with AND');
  }
  // how long: first, the number with the time sign; still true now, so no PAST
  add(`${cap(s.en)} ${have(s)} lived here for two years.`, join('TWO YEAR', 'HERE', s.g, 'LIVE'), 'how long');
  add(`${cap(s.en)} ${have(s)} been waiting for an hour.`, join('ONE HOUR', s.g, 'WAIT'), 'how long, -ing');
  // clock time first
  add(`${cap(s.en)} ${s.p === 3 ? v.s : v.base} ${o.en} at seven.`, join('TIME SEVEN', s.g, v.g, o.g), 'clock time');
  add(`${cap(s.en)} ${s.p === 3 ? v.s : v.base} ${o.en} at 5 pm.`, join('TIME 5 PM', s.g, v.g, o.g), 'clock time pm');
  // never / won't: after the action
  add(`${cap(s.en)} never ${s.p === 3 ? v.s : v.base} ${o.en}.`, join(s.g, v.g, o.g, 'NEVER'), 'never');
  add(`${cap(s.en)} won't ${v.base} ${o.en} tomorrow.`, join('TOMORROW', s.g, v.g, o.g, 'NOT'), "won't");
}
// a described subject: the thing, then colour, then size
for (const [en, g] of [['The big dog', 'DOG BIG'], ['The small black cat', 'CAT BLACK SMALL'], ['My new teacher', 'MY TEACHER NEW']]) {
  for (const v of PLAIN.slice(0, 6)) {
    const o = pick(OBJECTS, 8); n++;
    add(`${en} ${v.s} ${o.en}.`, join(g, v.g, o.g), 'described subject');
  }
}
// commands: no subject; the action, then the thing
for (const v of PLAIN) {
  const o = pick(OBJECTS, 9); n++;
  add(`Please ${v.base} ${o.en}.`, join('PLEASE', v.g, o.g), 'command');
  add(`Don't ${v.base} ${o.en}.`, join(v.g, o.g, 'NOT'), 'negative command');
}

let failed = 0;
const tally = {};
for (const c of cases) {
  const got = glossLine(buildSentence(c.en, lex));
  if (got === c.gloss) continue;
  failed++;
  tally[c.why] = (tally[c.why] || 0) + 1;
  if (list) console.log(`${c.en}\n   want ${c.gloss}\n   got  ${got}`);
}
console.log(`grammar generated: ${cases.length - failed} of ${cases.length} sentences pass`);
if (failed) {
  console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, x]) => `  ${x} × ${k}`).join('\n'));
  process.exitCode = 1;
}
