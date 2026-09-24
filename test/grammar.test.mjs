// The sentence builder against the examples in Real SASL's own lessons, and
// the everyday sentences a learner is likely to paste.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildParagraph, buildSentence, glossLine, makeLexicon, splitSentences, RULES } from '../src/grammar.js';

const labels = JSON.parse(fs.readFileSync(new URL('../data/signs.json', import.meta.url))).entries.map((e) => e.label);
const lex = makeLexicon(labels);
const line = (text) => glossLine(buildSentence(text, lex));

// Real SASL, "Where to place time related signs in a sentence"
assert.equal(line('I am going to the shop.'), 'SHOP ME GO');
assert.equal(line('Yesterday I went to the shop.'), 'YESTERDAY SHOP ME GO');
assert.equal(line('Tomorrow I will go to the shop.'), 'TOMORROW SHOP ME GO');
// Real SASL, "Indexing and pointing"
assert.equal(line('Tomorrow Alex will go home.'), 'TOMORROW HOME A-L-E-X GO');
// Real SASL, "Where to place an adjective": the thing, its colour, its size, how many
assert.equal(line('I have two big white houses.'), 'ME HOUSE WHITE BIG TWO HAVE');
assert.equal(line('My brother has a white car.'), 'MY BROTHER CAR WHITE HAVE');
// Real SASL, "Three types of questions"
assert.equal(line('I like animals because they are beautiful.'), 'ME ANIMAL LIKE WHY THEY BEAUTIFUL');
const yn = buildSentence('Did you go to school?', lex);
assert.equal(yn.kind, 'yn');
assert.match(yn.marks[0].label, /eyebrows up/);
const wh = buildSentence('What is your name?', lex);
assert.equal(glossLine(wh), 'YOUR NAME WHAT');
assert.equal(wh.kind, 'wh');
// Real SASL, "What is a directional verb": subject and object fold into the verb
const help = buildSentence('I will help you.', lex);
assert.equal(glossLine(help), 'FUTURE HELP');
assert.match(help.signs[1].sub, /from me toward you/);

// negation: head shake over the verb; a sign that already means "not"
const neg = buildSentence("I don't like fish.", lex);
assert.equal(glossLine(neg), "ME FISH DON'T LIKE");
assert.ok(neg.marks.some((m) => m.kind === 'neg'));
assert.equal(line('She is not happy.'), 'SHE HAPPY NOT');
assert.equal(line('We have no money.'), "WE MONEY DON'T HAVE");

// dropped words say why
const eat = buildSentence('Yesterday I ate an apple.', lex);
assert.equal(glossLine(eat), 'YESTERDAY ME APPLE EAT');
assert.equal(eat.words.find((w) => w.text === 'an').drop, 'articles');
assert.deepEqual(eat.alt.map((i) => eat.signs[i].gloss), ['YESTERDAY', 'ME', 'EAT', 'APPLE']);
assert.equal(line('The big dog chased the small cat.'), 'PAST DOG BIG CAT SMALL CHASE');
assert.ok(buildSentence('The big dog chased the small cat.', lex).signs[0].added);
assert.equal(line('If it rains, I will stay home.'), 'FUTURE RAIN HOME ME STAY');
assert.equal(line('It is cold today.'), 'TODAY COLD');
assert.equal(line('Where is the nearest bus stop?'), 'BUS STOP NEAR WHERE');
assert.equal(line('My friend and I played soccer on Saturday.'), 'SATURDAY MY FRIEND AND ME SOCCER PLAY');

// a paragraph carries its time forward instead of repeating it
const para = buildParagraph('Yesterday I went to the shop. I bought bread.', lex);
assert.equal(para.length, 2);
assert.equal(glossLine(para[1]), 'ME BREAD BUY');
assert.ok(para[1].rules.includes('timeKept'));

// sentences split sensibly
assert.deepEqual(splitSentences('Hello Mr. Dlamini. How are you? I am fine!').map((s) => s.text),
  ['Hello Mr. Dlamini.', 'How are you?', 'I am fine!']);

// every rule a sentence cites exists and says where it comes from
for (const s of buildParagraph('I like animals because they are beautiful. Did you go to school? Her sister is tall.', lex)) {
  for (const r of s.rules) {
    assert.ok(RULES[r], r);
    assert.ok(RULES[r].source || RULES[r].strength === 'note', `${r} has no source`);
  }
}

console.log('grammar: ok');

// --- checking a signed attempt against the plan ------------------------------
import { alignAttempt } from '../src/sentence-practice.js';

const ranked = (...labels) => labels.map((label, k) => ({ label, score: 1 - k / 100 }));
const filler = Array.from({ length: 60 }, (_, k) => `W${k}`);
const plan = [
  { gloss: 'YESTERDAY', entry: 'YESTERDAY' }, { gloss: 'SHOP', entry: null },
  { gloss: 'ME', entry: 'ME' }, { gloss: 'APPLE', entry: 'APPLE' }, { gloss: 'EAT', entry: 'EAT' },
];
// four pieces: YESTERDAY clearly, an extra movement, ME clearly, then APPLE only 30th; EAT never signed
const pieces = [
  ranked('YESTERDAY', 'TODAY', ...filler),
  ranked(...filler),
  ranked('ME', 'YOU', ...filler),
  ranked(...filler.slice(0, 29), 'APPLE', ...filler.slice(29)),
];
const a = alignAttempt(plan, pieces);
assert.deepEqual(a.signs.map((s) => s.status), ['seen', 'unchecked', 'seen', 'close', 'missed']);
assert.equal(a.checked, 4);
assert.equal(a.seen, 2);
assert.equal(a.extra, 0);   // the unmatched piece sits where SHOP (no clip) was signed, so it is not extra
// order matters: the same signs in the wrong order cannot all line up
const swapped = alignAttempt(plan.filter((p) => p.entry), [ranked('EAT', ...filler), ranked('APPLE', ...filler), ranked('ME', ...filler), ranked('YESTERDAY', ...filler)]);
assert.ok(swapped.seen < 4);
console.log('sentence practice: ok');
