// "Understand me": the SASL order the sentence builder makes should read back
// as the English it came from, and the decoder should prefer a sensible order
// only when the recogniser is unsure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSentence, makeLexicon } from '../src/grammar.js';
import { decode, toEnglish, kindOf } from '../src/interpret.js';

const labels = JSON.parse(fs.readFileSync(new URL('../data/signs.json', import.meta.url))).entries.map((e) => e.label);
const lex = makeLexicon(labels);
const roundTrip = (text) => toEnglish(buildSentence(text, lex).signs.map((s) => s.gloss)).english;

for (const t of ['Yesterday I went to the shop.', 'Tomorrow I will go to school.', 'What is your name?', 'Where do you live?',
  'My mother is a teacher.', 'She is not happy.', 'I have two big white houses.', 'Yesterday I ate an apple.',
  'Who is your teacher?', 'My brother has a white car.', 'I never eat meat.', 'The dog is big.', 'I like my friend.',
  'I want to learn sign language.']) {
  assert.equal(roundTrip(t), t, t);
}
assert.equal(roundTrip("I don't like fish."), 'I do not like fish.');
assert.equal(toEnglish(['APPLE', 'EAT']).english, 'I eat an apple.');
assert.deepEqual(toEnglish(['APPLE', 'EAT']).assumed.length, 1);
assert.equal(kindOf('SHOP'), 'verb');                  // alone it could be either; in a sentence the order decides
assert.equal(toEnglish(['SHOP', 'ME', 'GO']).english, 'I go to the shop.');

// decoding: a clear reading wins; a near tie is broken by SASL order
const r = (...pairs) => pairs.map(([label, score]) => ({ label, score }));
const clear = decode([r(['ME', 5], ['YOU', 2]), r(['APPLE', 4], ['EAT', 1]), r(['EAT', 4], ['APPLE', 3.9])]);
assert.deepEqual(clear.signs.map((s) => s.label), ['ME', 'APPLE', 'EAT']);
const tie = decode([r(['WHERE', 3.0], ['YESTERDAY', 2.95]), r(['YOU', 4]), r(['LIVE', 4]), r(['WHERE', 3.0], ['YESTERDAY', 2.95])]);
assert.equal(tie.signs[0].label, 'YESTERDAY');       // time opens a sentence
assert.equal(tie.signs.at(-1).label, 'WHERE');       // the question word closes it
const twice = decode([r(['HELLO', 5]), r(['HELLO', 5]), r(['YOU', 4])]);
assert.deepEqual(twice.signs.map((s) => s.label), ['HELLO', 'YOU']);
console.log('interpret: ok');
