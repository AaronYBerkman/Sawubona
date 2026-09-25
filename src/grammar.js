// The sentence builder: English in, a learner's SASL sign order out.
//
// Every sign it proposes carries the rule that put it there, and every
// English word that is not signed says why, so the order can be read as a
// lesson rather than taken on trust. The rules and their strength come from
// SASL sources (RULES below): Real SASL's own lessons, the DBE curriculum
// (CAPS) and published SASL linguistics. Where the sources disagree - which
// of subject, object and verb comes first - it says so and shows the other
// common order too.
//
// It is a guide for simple sentences, not a translator: SASL uses space,
// the face and the shape of the movement in ways a word list cannot show.
// Sentences it cannot parse with confidence are marked "rough".
//
//   const lex = makeLexicon(labels)            // dictionary sign labels
//   const out = buildParagraph(text, lex)      // [{ text, signs, words, marks, rules, ... }]

import * as W from './grammar-words.js';

const RS_TIME = 'Real SASL, "Where to place time related signs in a sentence"';
const RS_GRAMMAR = 'Real SASL, "Sign language grammar"';
const CAPS = 'DBE, CAPS SASL Home Language (Gr 4-12)';
const RS_ADJ = 'Real SASL, "Where to place an adjective" (topic-comment)';
const RS_Q = 'Real SASL, "Three types of questions"';
const RS_INDEX = 'Real SASL, "Indexing and pointing"';
const RS_DIR = 'Real SASL, "What is a directional verb"';

export const RULES = {
  time: {
    title: 'Time comes first',
    text: 'Time signs - YESTERDAY, TOMORROW, MONDAY, at 5 pm - open the sentence. They set the tense, so the rest of the sentence stays the same.',
    source: RS_TIME, strength: 'strong',
  },
  tense: {
    title: 'The verb does not change',
    text: 'went, going and goes are all GO. English puts the tense in the verb; SASL puts it in a time sign at the start, so one is added here.',
    source: `${RS_TIME}; ${CAPS}`, strength: 'moderate',
  },
  timeKept: {
    title: 'Time is already set',
    text: 'An earlier sentence set the time, and it holds until you change it.',
    source: RS_TIME, strength: 'moderate',
  },
  place: {
    title: 'The place sets the scene',
    text: 'Real SASL signs "I am going to the shop" as SHOP ME GO, and "tomorrow Alex goes home" as TOMORROW HOUSE ALEX GO: the place early, then who, then the action. "to", "at" and "in" are not signed. (Its lessons also show GIRL HOUSE STAY, with the place after who.)',
    source: `${RS_TIME}; ${RS_INDEX}`, strength: 'moderate',
  },
  order: {
    title: 'Who, what, then the action',
    text: 'Real SASL teaches subject, object, verb: ME APPLE EAT. Signers also use the English-like order ME EAT APPLE, but the appropriate order depends on context; this app cannot validate that context.',
    source: `${RS_GRAMMAR}; Wehrmeyer 2025 (SVO in natural signing)`, strength: 'flexible',
  },
  wh: {
    title: 'Question word at the end',
    text: 'WHAT, WHERE, WHO, WHEN, WHY and HOW go at the end of the question, with your eyebrows furrowed: YOUR NAME WHAT? (In relaxed conversation many Deaf signers raise their eyebrows instead - both are seen.)',
    source: `De Barros 2017; ${RS_Q}; Real SASL, Day 18`, strength: 'strong',
  },
  yn: {
    title: 'Yes/no questions: eyebrows up',
    text: 'The order stays the same as a statement. Raise your eyebrows and lean forward: "Did you go to school?" is SCHOOL GO, eyebrows up.',
    source: `${RS_Q}; Huddlestone 2017`, strength: 'strong',
  },
  neg: {
    title: 'Shake your head to say no',
    text: 'The head shake is what makes it negative: GIRL HOUSE STAY with a head shake means "the girl is not staying at the house". NOT, if you sign it, comes after the verb.',
    source: 'De Barros & Siebörger 2016; Huddlestone 2017', strength: 'strong',
  },
  negSign: {
    title: 'One sign already says "not"',
    text: 'SASL has its own sign for this negative, so it replaces the verb and NOT together. Still shake your head.',
    source: 'Real SASL dictionary', strength: 'strong',
  },
  articles: {
    title: 'No "a", "an" or "the"',
    text: 'SASL has no articles. Point to a thing, or place it in the space in front of you, instead.',
    source: RS_GRAMMAR, strength: 'moderate',
  },
  be: {
    title: 'No "to be"',
    text: 'is, am, are, was and were are not signed: "I am happy" is ME HAPPY.',
    source: `Wehrmeyer 2025; ${RS_GRAMMAR}`, strength: 'moderate',
  },
  aux: {
    title: 'Helper words are not signed',
    text: '"do", "does", "did", "will" and "have" only build English questions, negatives and tenses. The time sign and your face do that job in SASL.',
    source: `${RS_TIME}; ${CAPS}`, strength: 'moderate',
  },
  to: {
    title: '"to" before a verb is not signed',
    text: '"I want to eat" is ME WANT EAT.',
    source: RS_GRAMMAR, strength: 'moderate',
  },
  adj: {
    title: 'The thing first, then describe it',
    text: 'Draw the outline, then colour it in: the noun first, then its colour, then its size, then how many. "Two big white houses" is HOUSE WHITE BIG TWO.',
    source: `${RS_ADJ}; ${CAPS}`, strength: 'strong',
  },
  point: {
    title: 'He, she, it and they are pointing',
    text: 'Introduce the person (name or sign name) and point to give them a place in front of you. After that, point to that spot each time you mean them. Use the index finger (G-hand).',
    source: `${RS_INDEX}; ${CAPS}`, strength: 'strong',
  },
  possess: {
    title: 'His, her, their: point with an A-hand',
    text: 'Possessives use an A-hand toward the owner, where you placed them.',
    source: RS_INDEX, strength: 'moderate',
  },
  because: {
    title: '"Because" becomes a question',
    text: 'SASL turns "because" into a rhetorical question: "I like animals because they are beautiful" is ANIMALS LIKE, WHY? BEAUTIFUL. Raise your eyebrows on WHY, then give the answer.',
    source: RS_Q, strength: 'strong',
  },
  plural: {
    title: 'Plurals',
    text: 'SASL does not add -s. Show more than one with a number, MANY, or by repeating the sign in a few places.',
    source: CAPS, strength: 'moderate',
  },
  condition: {
    title: 'The condition comes first',
    text: 'The "if" or "when" part goes first, with your eyebrows raised. The face does the work of IF, so the sign is not needed.',
    source: `${CAPS}; Huddlestone 2017`, strength: 'moderate',
  },
  space: {
    title: 'Show where with your hands',
    text: 'Set up the place first, then show the other thing in relation to it (under, on, behind) with your hands.',
    source: CAPS, strength: 'moderate',
  },
  directional: {
    title: 'The verb moves between people',
    text: 'HELP, GIVE, SHOW, SEND, TELL and EMAIL move from the giver toward the receiver, so the verb says who does it to whom: "I help you" is one sign, HELP, moving from you to them.',
    source: `${RS_DIR}; ${CAPS}`, strength: 'strong',
  },
  spell: {
    title: 'Names are fingerspelled',
    text: 'Fingerspell a name the first time. Deaf people give each other sign names, which you can use after that.',
    source: 'Real SASL, "Sign names"', strength: 'strong',
  },
  missing: {
    title: 'Not in this dictionary yet',
    text: 'The word has a sign, but this dictionary does not have a clip of it yet. Look it up before fingerspelling it.',
    source: '', strength: 'note',
  },
  dummy: {
    title: '"It" in "it rains" is not signed',
    text: 'English needs a subject there; SASL just signs RAIN.',
    source: '', strength: 'note',
  },
  kept: {
    title: 'Kept in English order',
    text: 'The sources say nothing firm about where this goes, so it stays where English puts it.',
    source: '', strength: 'note',
  },
};

// ---------------------------------------------------------------- lexicon

export function glossKey(s) {
  return s.toUpperCase().replace(/[‘’]/g, "'").replace(/\s*\(.*$/, '').replace(/[^A-Z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const SPELLINGS = [['OUR', 'OR'], ['ISE', 'IZE'], ['ISED', 'IZED'], ['ISING', 'IZING'], ['TRE', 'TER'], ['OGUE', 'OG']];
function variants(k) {
  const out = [k, k.replace(/-/g, ' '), k.replace(/ /g, '-')];
  for (const [a, b] of SPELLINGS) {
    if (k.endsWith(a)) out.push(k.slice(0, -a.length) + b);
    if (k.endsWith(b)) out.push(k.slice(0, -b.length) + a);
  }
  if (k === 'PRACTICE') out.push('PRACTISE');
  if (k === 'PRACTISE') out.push('PRACTICE');
  return out;
}

/** labels: every sign label the dictionary has (repeats are fine). */
export function makeLexicon(labels) {
  const map = new Map();
  for (const label of labels) {
    const k = glossKey(label);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    if (!map.get(k).includes(label)) map.get(k).push(label);
  }
  const longest = Math.max(1, ...[...map.keys()].map((k) => k.split(' ').length));
  return {
    size: map.size,
    longest,
    find(gloss) {
      for (const k of variants(glossKey(gloss))) if (map.has(k)) return map.get(k)[0];
      return null;
    },
    all(gloss) {
      for (const k of variants(glossKey(gloss))) if (map.has(k)) return map.get(k);
      return [];
    },
  };
}

// ---------------------------------------------------------------- sentences

const ABBREV = /\b(mr|mrs|ms|dr|prof|st|e\.g|i\.e|etc|vs)\.$/i;

/** Split a paragraph into sentences, keeping each one's place in the text. */
export function splitSentences(text) {
  const out = [];
  const re = /[^.!?\n]+(?:[.!?]+(?=\s|$)|\n|$)|[.!?]+/g;
  let m;
  let carry = null;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) { if (m[0] === '') re.lastIndex++; continue; }
    const start = carry ? carry.start : m.index;
    const piece = text.slice(start, m.index + m[0].length);
    if (ABBREV.test(piece.trim()) && re.lastIndex < text.length) { carry = { start }; continue; }
    carry = null;
    const lead = piece.length - piece.trimStart().length;
    const t = piece.trim();
    if (/[A-Za-z0-9]/.test(t)) out.push({ text: t, start: start + lead, end: start + lead + t.length });
    if (m[0] === '') re.lastIndex++;
  }
  return out;
}

// ---------------------------------------------------------------- words

const CONTRACTIONS = {
  "can't": ['can', 'not'], cannot: ['can', 'not'], "won't": ['will', 'not'], "shan't": ['shall', 'not'],
  "ain't": ['is', 'not'], "i'm": ['i', 'am'],
};

// People often leave the apostrophe out. Words that are also ordinary English
// (well, were, shell, ill, wed, shed, hell) are never read as contractions;
// its, id and lets are decided from the next word (see tokenize).
const NO_APOSTROPHE = Object.fromEntries(`dont:don't doesnt:doesn't didnt:didn't cant:can't wont:won't isnt:isn't
  arent:aren't wasnt:wasn't werent:weren't havent:haven't hasnt:hasn't hadnt:hadn't couldnt:couldn't
  shouldnt:shouldn't wouldnt:wouldn't mustnt:mustn't aint:ain't im:i'm ive:i've youre:you're youve:you've
  youll:you'll youd:you'd theyre:they're theyve:they've theyll:they'll theyd:they'd weve:we've hes:he's
  shes:she's itll:it'll thats:that's whats:what's wheres:where's whos:who's hows:how's theres:there's
  heres:here's hed:he'd`.trim().split(/\s+/).map((p) => p.split(':')));
// titles before a name; the full stop after them does not end the sentence
const TITLES = { dr: 'DOCTOR', doctor: 'DOCTOR', mr: 'MR', mrs: 'MRS', ms: 'MS', miss: 'MISS', prof: 'PROFESSOR', professor: 'PROFESSOR' };

function tokenize(sentence) {
  const re = /(\d+(?:[:.h]\d+)?(?:\s?(?:am|pm|a\.m\.|p\.m\.)(?![a-z]))?)|([A-Za-zÀ-ÿ]+(?:[-'’][A-Za-zÀ-ÿ]+)*)|([,;:?!.])/gi;
  // WRITTEN IN CAPITALS: a capital letter says nothing about names
  const allCaps = !/[a-zà-ÿ]/.test(sentence);
  const words = [];
  const toks = [];
  let letWord = null;
  let m;
  while ((m = re.exec(sentence))) {
    let text = m[0];
    let low = text.toLowerCase().replace(/’/g, "'");
    if (m[2] && TITLES[low] && sentence[m.index + text.length] === '.') { text += '.'; re.lastIndex++; }
    const wi = words.length;
    words.push({ text, start: m.index, end: m.index + text.length, punct: !!m[3] });
    const push = (w, extra = {}) => toks.push({ w, text, wi, cap: !allCaps && /^[A-Z]/.test(text), upper: allCaps && /[A-Z]/.test(text), ...extra });
    // 5pm, 5 p.m. and 5 PM are all "5 pm"
    if (m[1]) { push(low.replace(/\s?([ap])\.m\.$/, ' $1m').replace(/(\d)\s?(am|pm)$/, '$1 $2'), { num: true }); continue; }
    if (m[3]) { push(low, { punct: true }); continue; }
    if (TITLES[low] && (text.endsWith('.') || /^[ ]+[A-Z][a-z]/.test(sentence.slice(m.index + text.length)))) { push(low, { title: true }); continue; }
    const nextWord = (/^\s*([A-Za-z']+)/.exec(sentence.slice(m.index + text.length)) || [])[1]?.toLowerCase();
    const startOfSentence = !toks.some((t) => !t.punct && !W.GREETINGS[t.w]);
    if (NO_APOSTROPHE[low]) low = NO_APOSTROPHE[low];
    // its + a describing word is "it's" (its cold); its + a noun is the possessive (its tail)
    else if (low === 'its' && nextWord && (W.ADJECTIVES.has(nextWord) || /ing$/.test(nextWord) || W.DETERMINERS.has(nextWord)
      || ['not', 'very', 'so', 'too', 'really', 'time', 'late', 'early', 'raining', 'snowing'].includes(nextWord) || W.TIME_WORDS[nextWord])) low = "it's";
    // id + a verb is "I'd" (id like tea); otherwise an ID (document)
    else if (low === 'id' && nextWord && (W.VERBS.has(nextWord) || ['rather', 'better'].includes(nextWord))) low = "i'd";
    // "lets go" at the start is "let's go"; "she lets me" is the verb
    else if (low === 'lets' && startOfSentence) low = "let's";
    // let's (or "let us" at the start) is a suggestion to "us": WE, and the sentence is a command
    if (low === "let's") { push('we', { lets: true, subject: true }); continue; }
    if (low === 'let' && startOfSentence && nextWord === 'us') { letWord = wi; continue; }
    if (low === 'us' && letWord != null) { push('we', { lets: true, subject: true, wis: [letWord, wi] }); letWord = null; continue; }
    if (CONTRACTIONS[low]) { CONTRACTIONS[low].forEach((p, k) => push(p, k ? { contracted: true } : { cant: low !== "won't" && p === 'can' })); continue; }
    let r;
    if ((r = /^(.+)n't$/.exec(low))) { push(r[1]); push('not', { contracted: true }); continue; }
    if ((r = /^(.+)'(m|re|ve|ll|d)$/.exec(low))) {
      push(r[1]);
      push({ m: 'am', re: 'are', ve: 'have', ll: 'will', d: 'would' }[r[2]], { contracted: true });
      continue;
    }
    if ((r = /^(.+)'s$/.exec(low))) {
      const head = r[1];
      if (W.PRONOUNS[head] || W.WH[head] || ['that', 'there', 'here', 'it', 'what', 'where', 'who', 'how'].includes(head)) {
        // he's got = he has got
        push(head); push(nextWord === 'got' ? 'has' : 'is', { contracted: true });
      } else {
        push(head, { possessor: true });
      }
      continue;
    }
    if ((r = /^(.+)s'$/.exec(low))) { push(r[1] + 's', { possessor: true }); continue; }
    push(low);
  }
  return { words, toks, allCaps };
}

// ---------------------------------------------------------------- lemmas

function verbBase(w) {
  if (W.IRREGULAR[w] && !W.IRREGULAR_NOUNS.has(w)) return W.IRREGULAR[w];
  if (W.VERBS.has(w)) return w;
  const tries = [];
  let r;
  if ((r = /^(.+)ies$/.exec(w))) tries.push(r[1] + 'y');
  if ((r = /^(.+)ied$/.exec(w))) tries.push(r[1] + 'y');
  if ((r = /^(.+?)(es|s)$/.exec(w))) tries.push(r[1], r[1] + (r[2] === 'es' ? 'e' : ''));
  if ((r = /^(.+?)(ing|ed)$/.exec(w))) {
    const s = r[1];
    tries.push(s, s + 'e');
    if (/(.)\1$/.test(s)) tries.push(s.slice(0, -1));
    if (/y$/.test(s) && r[2] === 'ing') tries.push(s);
    if (/i$/.test(s)) tries.push(s.slice(0, -1) + 'y');
  }
  if ((r = /^(.+)s$/.exec(w))) tries.push(r[1]);
  return tries.find((t) => W.VERBS.has(t)) || null;
}

function verbForm(w) {
  if (W.PAST_FORMS.has(w)) return 'past';
  if (W.VERBS.has(w) && !W.IRREGULAR[w]) return 'base';
  if (/ing$/.test(w)) return 'ing';
  if (/ed$/.test(w)) return 'past';
  if (/s$/.test(w) && !/ss$/.test(w)) return 's';
  return 'base';
}

function nounBase(w) {
  if (W.IRREGULAR_NOUNS.has(w) || /ies$/.test(w) && W.IRREGULAR[w]) return { base: W.IRREGULAR[w], plural: true };
  let r;
  if (w.length > 3 && !/(ss|us|is|ous)$/.test(w)) {
    if ((r = /^(.+)ies$/.exec(w))) return { base: r[1] + 'y', plural: true };
    if ((r = /^(.+(?:ss|x|zz|ch|sh))es$/.exec(w))) return { base: r[1], plural: true };
    if ((r = /^(.+[sz])es$/.exec(w))) return { base: r[1] + 'e', alt: r[1], plural: true };
    if ((r = /^(.+[^s])s$/.exec(w))) return { base: r[1], plural: true };
  }
  return { base: w, plural: false };
}

function adjBase(w) {
  if (W.ADJECTIVES.has(w)) return w;
  const irregular = { better: 'good', best: 'good', worse: 'bad', worst: 'bad', more: 'many', less: 'little' };
  if (irregular[w]) return irregular[w];
  let r;
  if ((r = /^(.+?)(er|est)$/.exec(w))) {
    const s = r[1];
    for (const t of [s, s + 'e', /(.)\1$/.test(s) ? s.slice(0, -1) : null, /i$/.test(s) ? s.slice(0, -1) + 'y' : null]) {
      if (t && W.ADJECTIVES.has(t)) return t;
    }
  }
  return null;
}

// quickly -> quick, happily -> happy, gently -> gentle; only when the base is a known word, so a
// name such as Kelly is never cut to KEL
function adverbBase(w) {
  if (!/ly$/.test(w) || W.NOT_ADVERBS.has(w) || w.length < 5) return null;
  const s = w.slice(0, -2);
  const tries = [s, /i$/.test(s) ? s.slice(0, -1) + 'y' : null, s + 'e', s + 'le', /l$/.test(s) ? s + 'l' : null];
  return tries.find((b) => b && (W.ADJECTIVES.has(b) || W.COMMON.has(b))) || null;
}

// ---------------------------------------------------------------- tagging

const ADVERBS = new Set('very really too also just only quite so well together even still almost maybe perhaps please'.split(' '));
const PARTICLES = new Set('up down out off away back over around'.split(' '));
// words that can stand between "have" and its participle: "have already eaten", "has just left"
const BETWEEN_HAVE = new Set('already just ever never recently since still also always yet'.split(' '));
const REDUNDANT_PARTICLE = new Set(['sit down', 'lie down', 'stand up', 'hurry up', 'look at']);
const MOTION = new Set('go come walk run drive ride fly travel move arrive return leave hurry rush go'.split(' '));
const GIVING = new Set('give send tell show ask help pay teach bring lend email text phone call visit invite warn copy'.split(' '));
const COLOURS = new Set('red blue green yellow black white brown grey gray pink purple orange gold silver'.split(' '));
const WEATHER = new Set('rain snow hail thunder storm shine'.split(' '));
const LINKING = new Set('smell look feel taste sound seem become get stay'.split(' '));
const WEATHER_ADJ = new Set('cold hot warm cool sunny windy cloudy rainy wet dry dark late early'.split(' '));
const PERCEPTION_COMPLEMENT = new Set('think know say believe hope feel mean see hear understand remember forget wish tell'.split(' '));

function isTimeNoun(w) { return W.TIME_NOUNS.has(w) || W.TIME_NOUNS.has(nounBase(w).base); }

/** Join multi-word time expressions, question words and greetings into single tokens. */
function joinPhrases(toks) {
  const out = [];
  const w = (k) => toks[k]?.w;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const span = (n, extra) => { out.push({ ...t, w: toks.slice(i, i + n).map((x) => x.w).join(' '), wis: toks.slice(i, i + n).flatMap((x) => x.wis || [x.wi]), ...extra }); i += n - 1; };
    // "in", "on" and "at" before a time, and "the" in "in the morning", are not signed
    const fn = (n) => toks.slice(i, i + n).filter((x) => ['in', 'on', 'at', 'the', 'a'].includes(x.w)).map((x) => ({ wi: x.wi, why: ['the', 'a'].includes(x.w) ? 'articles' : 'place' }));
    const two = `${w(i)} ${w(i + 1)}`;
    const opening = out.every((x) => x.punct || x.tag === 'INTJ');
    // "see you (tomorrow)" is the goodbye only on its own; "I will see you" is the verb
    if (W.GREETINGS[two] && (two !== 'see you' || opening)) { span(2, { tag: 'INTJ', gloss: W.GREETINGS[two], farewell: two === 'see you' }); continue; }
    if (W.WH[two]) { span(2, { tag: 'WH', gloss: W.WH[two] }); continue; }
    // a lot of / lots of / plenty of: how much, signed after the thing (FOOD LOT)
    if (w(i) === 'a' && w(i + 1) === 'lot' && w(i + 2) === 'of') { span(3, { quant: 'LOT' }); continue; }
    if (['lots', 'plenty'].includes(w(i)) && w(i + 1) === 'of') { span(2, { quant: w(i) === 'lots' ? 'LOT' : 'PLENTY' }); continue; }
    if (W.FIXED_PLACES[two]) { span(2, { tag: 'PLACEADV', gloss: W.FIXED_PLACES[two] }); continue; }
    if (`${two} ${w(i + 2)}` === 'the day after' && w(i + 3) === 'tomorrow') { span(4, { tag: 'TIME', parts: ['DAY-AFTER-TOMORROW'] }); continue; }
    if (`${two} ${w(i + 2)}` === 'the day before' && w(i + 3) === 'yesterday') { span(4, { tag: 'TIME', parts: ['DAY-BEFORE-YESTERDAY'] }); continue; }
    // last week / next Monday / this morning / every day / all day
    if (['last', 'next', 'this', 'every', 'each', 'all'].includes(w(i)) && isTimeNoun(w(i + 1) || '')) {
      const head = nounBase(w(i + 1)).base;
      if (w(i) === 'all' && !['day', 'night', 'week', 'morning', 'year'].includes(head)) { out.push({ ...t, wis: t.wis || [t.wi] }); continue; }
      span(2, { tag: 'TIME', parts: [w(i) === 'each' ? 'EVERY' : w(i).toUpperCase(), head.toUpperCase()] });
      continue;
    }
    // in May / since March: a capitalised month after a preposition is the month
    // ("May" alone could be the modal)
    if (['in', 'since', 'until', 'during', 'by'].includes(w(i)) && W.MONTHS.includes(w(i + 1)) && toks[i + 1].cap) {
      span(2, { tag: 'TIME', parts: [w(i + 1).toUpperCase()], fn: fn(1) });
      continue;
    }
    // in the morning / at night / on Monday / during the holidays
    if (['in', 'on', 'at', 'during', 'over'].includes(w(i))) {
      const skip = ['the', 'a'].includes(w(i + 1)) ? 1 : 0;
      const n = w(i + 1 + skip);
      if (n && isTimeNoun(n) && !['time', 'past', 'future', 'second'].includes(n)) {
        span(2 + skip, { tag: 'TIME', parts: [nounBase(n).base.toUpperCase()], fn: fn(2 + skip) });
        continue;
      }
      // at 5 / at 5 pm / at 5 o'clock
      if (w(i) === 'at' && (toks[i + 1]?.num || typeof W.NUMBERS[w(i + 1)] === 'number' && ['pm', 'am', "o'clock", 'oclock'].includes(w(i + 2)))) {
        const n2 = ['pm', 'am', "o'clock", 'oclock'].includes(w(i + 2)) ? 3 : 2;
        span(n2, { tag: 'TIME', parts: ['TIME', toks.slice(i + 1, i + n2).map((x) => x.w.toUpperCase()).join(' ')], fn: fn(1) });
        continue;
      }
    }
    // two weeks ago / in three days
    const numWord = (k) => toks[k]?.num || typeof W.NUMBERS[w(k)] === 'number' || w(k) === 'a';
    if (numWord(i) && isTimeNoun(w(i + 1) || '') && w(i + 2) === 'ago') {
      span(3, { tag: 'TIME', parts: [w(i) === 'a' ? 'ONE' : w(i).toUpperCase(), nounBase(w(i + 1)).base.toUpperCase(), 'PAST'], past: true });
      continue;
    }
    if (w(i) === 'in' && numWord(i + 1) && isTimeNoun(w(i + 2) || '')) {
      span(3, { tag: 'TIME', parts: ['FUTURE', w(i + 1) === 'a' ? 'ONE' : w(i + 1).toUpperCase(), nounBase(w(i + 2)).base.toUpperCase()], future: true });
      continue;
    }
    if (W.TIME_WORDS[w(i)] && !W.FREQUENCY.has(w(i)) && isTimeNoun(w(i + 1) || '') && !['before', 'then', 'past', 'future'].includes(w(i))) {
      span(2, { tag: 'TIME', parts: [W.TIME_WORDS[w(i)], nounBase(w(i + 1)).base.toUpperCase()] });
      continue;
    }
    out.push({ ...t, wis: t.wis || [t.wi] });
  }
  return out;
}

// Closed-class words are never names, whatever their capital letter.
function closedClass(w) {
  return W.DETERMINERS.has(w) || W.QUANTIFIERS.has(w) || !!W.PRONOUNS[w] || !!W.POSSESSIVES[w] || W.PREPOSITIONS.has(w)
    || W.BE.has(w) || W.HAVE.has(w) || W.DO.has(w) || !!W.MODALS[w] || !!W.WH[w] || W.CONJUNCTIONS.has(w)
    || W.SUBORDINATORS.has(w) || !!W.GREETINGS[w] || !!W.TIME_WORDS[w] || w in W.NUMBERS || ADVERBS.has(w) || w === 'not';
}

/** An ordinary English word (not a name), whatever the dictionary has. */
function isCommon(w) {
  if (W.PLACE_NAMES.has(w)) return false;
  if (W.COMMON.has(w) || W.VERBS.has(w) || W.ADJECTIVES.has(w) || W.PLACES.has(w) || W.TIME_NOUNS.has(w) || W.IRREGULAR[w]) return true;
  const nb = nounBase(w);
  return W.COMMON.has(nb.base) || W.PLACES.has(nb.base) && !W.PLACE_NAMES.has(nb.base) || (nb.alt && W.COMMON.has(nb.alt)) || !!verbBase(w) || !!adjBase(w) || !!adverbBase(w);
}

// a word that can only be read as a verb with a subject before it: "fish swim" makes FISH the subject
function verbAfterSubject(x) {
  if (!x || x.punct) return false;
  if (W.BE.has(x.w) || W.MODALS[x.w] || ['does', 'did', 'has', 'had'].includes(x.w) || x.contracted && !['not', 'we'].includes(x.w)) return true;
  return !!verbBase(x.w) && ['s', 'past'].includes(verbForm(x.w)) && !W.PREPOSITIONS.has(x.w);
}

// "my name is Alex", "I am Thabo", "this is Sipho": the next word is expected to be a name
function nameSlot(toks, i) {
  const a = toks[i - 1]?.w;
  const b = toks[i - 2]?.w;
  if (['is', "'s"].includes(a) && b === 'name' || ['called', 'named'].includes(a) || toks[i - 1]?.title) return 'name';
  if (a === 'am' && b === 'i' || a === 'is' && b === 'this') return 'am';
  return null;
}

function tag(toks, question, lex) {
  let seenVerb = false;
  let seenBe = false;
  let open = true;          // nothing but greetings, "please", "don't" or a time yet: a bare verb here is a command
  let command = false;      // this clause is a command
  let inSub = false;        // inside an if / when / because clause
  let subVerb = false;
  const firstWord = toks.findIndex((t) => !t.punct);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    i = tagOne(i);
    if (t.tag === 'VERB' && t.form === 'imperative' || t.tag === 'BE' && t.imperative) command = true;
    if (inSub && ['VERB', 'BE'].includes(t.tag)) subVerb = true;
    if (t.tag === 'CONJ') open = command;                              // "sit down and listen": both commands
    else if (t.tag === 'SUB') { inSub = true; subVerb = false; open = false; command = false; }
    else if (t.tag === 'PUNCT') {
      if (/[,;:]/.test(t.w) && inSub && subVerb) { inSub = false; open = true; }   // "If you are tired, go to bed"
    } else if (!['INTJ', 'NEG', 'TIME', 'FREQ'].includes(t.tag) && !(t.tag === 'AUX' && t.dont)) open = false;
  }
  return toks;

  function tagOne(i) {
    const t = toks[i];
    if (t.tag) { if (t.tag === 'VERB') seenVerb = true; return i; }
    const w = t.w;
    const prev = toks[i - 1];
    const next = toks[i + 1];
    const clauseStart = !prev || ['CONJ', 'SUB', 'PUNCT'].includes(prev.tag) || prev.tag === 'INTJ';
    if (t.punct) { t.tag = 'PUNCT'; if (/[,;:]/.test(w)) seenVerb = false; return i; }
    if (t.num) {
      t.tag = 'NUM';
      // a count is the same sign whether it is written 2 or two
      t.gloss = /^\d+$/.test(w) && +w < 1000 ? numberWords(+w) : w.toUpperCase();
      return i;
    }
    if (t.quant) { t.tag = 'QUANT'; t.gloss = t.quant; return i; }
    if (t.title) { t.tag = 'NOUN'; t.lemma = TITLES[w].toLowerCase(); t.gloss = TITLES[w]; return i; }
    if (t.lets) { t.tag = 'PRON'; t.gloss = 'WE'; t.subject = true; return i; }
    if (W.GREETINGS[w] && !(w === 'welcome' && prev && W.BE.has(prev.w))) {
      if (['yes', 'ok', 'okay', 'no'].includes(w) ? clauseStart : true) { t.tag = 'INTJ'; t.gloss = W.GREETINGS[w]; return i; }
    }
    if (w === 'no' && clauseStart && (!next || next.punct)) { t.tag = 'INTJ'; t.gloss = 'NO'; return i; }
    if (W.WH[w] && !['when', 'which', 'who', 'where', 'what', 'whose'].includes(w)) { t.tag = 'WH'; t.gloss = W.WH[w]; return i; }
    if (['when', 'where', 'which', 'who', 'what', 'whose'].includes(w)) {
      // a question word only in a question; otherwise it joins clauses
      const nounBefore = prev && ['NOUN', 'NAME', 'PRON'].includes(prev.tag);
      if (question && !nounBefore || ['what', 'whose'].includes(w)) { t.tag = 'WH'; t.gloss = W.WH[w]; return i; }
      t.tag = nounBefore && w !== 'when' ? 'REL' : 'SUB';
      t.gloss = w.toUpperCase();
      seenVerb = false;
      return i;
    }
    if (w === 'to') {
      const n = next?.w;
      t.tag = n && (W.VERBS.has(n) || W.BE.has(n)) && !W.PLACES.has(n) ? 'PART' : 'PREP';
      return i;
    }
    if (w === 'there' && next && W.BE.has(next.w)) { t.tag = 'EXIST'; return i; }
    if (W.DEICTIC_PLACES[w] && !(w === 'home' && prev && ['DET', 'POSS'].includes(prev.tag))) { t.tag = 'PLACEADV'; t.gloss = W.DEICTIC_PLACES[w]; return i; }
    if (w === 'her') {
      const n = next;
      const nounNext = n && !n.punct && !n.tag && !W.PREPOSITIONS.has(n.w) && !W.CONJUNCTIONS.has(n.w) && !W.TIME_WORDS[n.w] && !W.SUBORDINATORS.has(n.w) && !W.DETERMINERS.has(n.w) && !W.PRONOUNS[n.w];
      t.tag = nounNext ? 'POSS' : 'PRON';
      t.gloss = nounNext ? 'HER' : 'SHE';
      return i;
    }
    if (W.POSSESSIVES[w]) { t.tag = 'POSS'; t.gloss = W.POSSESSIVES[w]; return i; }
    if (W.PRONOUNS[w]) { t.tag = 'PRON'; t.gloss = W.PRONOUNS[w]; t.subject = W.SUBJECT_PRONOUNS.has(w); return i; }
    if (w === 'that' || w === 'this' || w === 'these' || w === 'those') {
      const n = next;
      if (w === 'that' && prev && (prev.tag === 'VERB' && PERCEPTION_COMPLEMENT.has(prev.lemma) || prev.tag === 'ADJ')) { t.tag = 'COMP'; return i; }
      if (w === 'that' && prev && ['NOUN', 'NAME'].includes(prev.tag)) { t.tag = 'REL'; return i; }
      // "this book" points at the book; "this your book" / "that is" is the pronoun
      const nounNext = n && !n.punct && !n.tag && !W.BE.has(n.w) && !W.MODALS[n.w] && !W.PREPOSITIONS.has(n.w) && !W.POSSESSIVES[n.w]
        && !W.DETERMINERS.has(n.w) && !W.PRONOUNS[n.w] && !W.CONJUNCTIONS.has(n.w) && !W.DO.has(n.w) && !W.HAVE.has(n.w);
      t.tag = nounNext ? 'DEM' : 'PRON';
      t.gloss = w.toUpperCase();
      t.point = true;
      return i;
    }
    if (W.DETERMINERS.has(w)) { t.tag = w === 'no' ? 'NEGDET' : 'DET'; return i; }
    if (W.QUANTIFIERS.has(w)) {
      const nounNext = next && !next.punct && !W.PREPOSITIONS.has(next.w) && !W.CONJUNCTIONS.has(next.w) && !W.TIME_WORDS[next.w];
      t.tag = nounNext || !['much', 'many', 'more', 'less', 'enough'].includes(w) ? 'QUANT' : 'ADV';
      t.gloss = w.toUpperCase();
      return i;
    }
    // "I have been to Durban" is having gone there: GO, not a dropped "to be"
    if (w === 'been' && next?.w === 'to' && toks.slice(0, i).some((x) => W.HAVE.has(x.w))) {
      t.tag = 'VERB'; t.lemma = 'go'; t.form = 'past'; seenVerb = true; return i;
    }
    if (W.BE.has(w)) {
      seenBe = true; t.tag = 'BE'; t.form = ['was', 'were'].includes(w) ? 'past' : 'present';
      if (w === 'be' && open && !question) t.imperative = true;             // "Be quiet."
      return i;
    }
    if (w === 'used' && next?.w === 'to' && toks[i + 2] && verbBase(toks[i + 2].w)) {
      t.tag = 'AUX'; t.form = 'past'; next.tag = 'PART'; return i + 1;
    }
    if (W.HAVE.has(w)) {
      // "have to" = must; "have got" = have; "have + participle" = perfect; otherwise possession
      if (next?.w === 'to') { t.tag = 'MODAL'; t.gloss = 'MUST'; next.tag = 'PART'; return i + 1; }
      if (next?.w === 'got') {
        t.tag = 'AUX'; t.form = w === 'had' ? 'past' : 'present';
        if (toks[i + 2]?.w === 'to') { next.tag = 'MODAL'; next.gloss = 'MUST'; toks[i + 2].tag = 'PART'; return i + 2; }
        Object.assign(next, { tag: 'VERB', lemma: 'have', form: 'base' }); seenVerb = true; return i + 1;
      }
      // "Have you got a pen?": have got is possession, with the subject between
      if (question && clauseStart && toks[i + 2]?.w === 'got' && (W.PRONOUNS[next?.w] || next?.cap)) {
        t.tag = 'AUX'; t.form = w === 'had' ? 'past' : 'present';
        Object.assign(toks[i + 2], { tag: 'VERB', lemma: 'have', form: 'base' });
        return i;
      }
      const n = toks.slice(i + 1).find((x) => !['NEG', 'ADV'].includes(x.tag) && x.w !== 'not' && !ADVERBS.has(x.w) && !W.FREQUENCY.has(x.w)
        && !BETWEEN_HAVE.has(x.w));
      const participle = n && (W.IRREGULAR[n.w] && !W.IRREGULAR_NOUNS.has(n.w) || /ed$/.test(n.w) && verbBase(n.w)) && !(n.w === 'had' && w === 'had');   // "have had" is the perfect of have; "had had" is left alone
      if (participle || (question && clauseStart && n && (n.tag === 'PRON' || W.PRONOUNS[n.w]) && toks.slice(i + 2).some((x) => verbBase(x.w) && (/ed$|en$/.test(x.w) || W.PAST_FORMS.has(x.w))))) {
        t.tag = 'AUX'; t.form = w === 'had' ? 'past' : 'perfect'; return i;
      }
      t.tag = 'VERB'; t.lemma = 'have'; t.form = w === 'had' ? 'past' : open && !question ? 'imperative' : 'base'; seenVerb = true; return i;
    }
    if (W.DO.has(w)) {
      const later = toks.slice(i + 1, i + 5).some((x) => x.w !== 'not' && verbBase(x.w) && !W.DETERMINERS.has(x.w));
      const auxLike = next && (next.w === 'not' || W.PRONOUNS[next.w] || W.DETERMINERS.has(next.w) || W.POSSESSIVES[next.w] || next.cap) && later;
      if (auxLike) {
        t.tag = 'AUX'; t.form = w === 'did' ? 'past' : 'present';
        if (next.w === 'not' && open && !question) t.dont = true;            // "Don't run!"
        return i;
      }
      t.tag = 'VERB'; t.lemma = 'do'; t.form = open && !question && w === 'do' ? 'imperative' : verbForm(w); seenVerb = true; return i;
    }
    if (W.MODALS[w]) {
      t.tag = 'MODAL'; t.gloss = W.MODALS[w];
      if (w === 'will' || w === 'shall') t.future = true;
      if (t.cant) t.gloss = 'CAN';
      return i;
    }
    if (w === 'not' || w === 'never') { t.tag = 'NEG'; t.gloss = w === 'never' ? 'NEVER' : 'NOT'; return i; }
    if (w === 'born' && prev && W.BE.has(prev.w)) { t.tag = 'VERB'; t.lemma = 'born'; t.form = 'base'; seenVerb = true; return i; }
    if (w === 'going' && next?.w === 'to' && toks[i + 2] && verbBase(toks[i + 2].w) && prev && W.BE.has(prev.w)) {
      t.tag = 'FUT'; next.tag = 'PART'; return i + 1;
    }
    // "so" before a describing word strengthens it (so tired); otherwise it joins clauses
    if (W.INTENSIFIERS[w] && next && !next.punct && (adjBase(next.w) || adverbBase(next.w) || W.INTENSIFIERS[next.w] || ['much', 'many', 'well', 'fast', 'hard'].includes(next.w))
      && !(w === 'so' && toks[i + 2] && (W.PRONOUNS[toks[i + 2].w] || W.BE.has(toks[i + 2].w)))) {
      t.tag = 'INTENS'; t.gloss = W.INTENSIFIERS[w]; return i;
    }
    if (W.CONJUNCTIONS.has(w)) { t.tag = 'CONJ'; t.gloss = w.toUpperCase(); seenVerb = false; return i; }
    if (W.SUBORDINATORS.has(w)) {
      const subjectNext = next && (W.PRONOUNS[next.w] || W.DETERMINERS.has(next.w) || W.POSSESSIVES[next.w] || next.cap);
      if (['before', 'after', 'until', 'since'].includes(w) && !subjectNext) {
        if (!next || next.punct) { t.tag = 'TIME'; t.parts = [w === 'before' ? 'BEFORE' : w === 'after' ? 'AFTER' : w.toUpperCase()]; return i; }
        t.tag = 'PREP'; return i;
      }
      t.tag = 'SUB'; t.gloss = w.toUpperCase(); seenVerb = false; return i;
    }
    if (W.TIME_WORDS[w] && !(w === 'past' || w === 'future') && !(w === 'then' && !clauseStart) && !(w === 'late' || w === 'early') && !(w === 'before' || w === 'afterwards') && !(w === 'once' && next && W.PRONOUNS[next.w])) {
      t.tag = W.FREQUENCY.has(w) ? 'FREQ' : 'TIME';
      t.parts = [W.TIME_WORDS[w]];
      t.gloss = W.TIME_WORDS[w];
      return i;
    }
    const monthMay = w === 'may' && ['in', 'of', 'since', 'until', 'during', 'from', 'by'].includes(prev?.w);
    if ((W.DAYS.includes(w) || W.MONTHS.includes(w) && t.cap && (w !== 'may' || monthMay)) && !['DET', 'POSS'].includes(prev?.tag)) { t.tag = 'TIME'; t.parts = [w.toUpperCase()]; return i; }
    if (W.PREPOSITIONS.has(w)) {
      if (w === 'like' && prev && (prev.tag === 'PRON' && prev.subject || ['AUX', 'MODAL', 'NEG', 'PART', 'FREQ'].includes(prev.tag) || ['NOUN', 'NAME'].includes(prev.tag) && !seenVerb)) {
        t.tag = 'VERB'; t.lemma = 'like'; t.form = 'base'; seenVerb = true; return i;
      }
      if (PARTICLES.has(w) && prev?.tag === 'VERB' && (!next || next.punct || ['CONJ', 'TIME', 'PREP'].includes(next.tag) || W.PREPOSITIONS.has(next.w) || W.TIME_WORDS[next.w])) {
        t.tag = 'PARTICLE'; return i;
      }
      t.tag = 'PREP'; return i;
    }
    if (ADVERBS.has(w)) {
      t.tag = 'ADV'; t.gloss = { too: 'ALSO', also: 'ALSO', maybe: 'MAYBE', perhaps: 'MAYBE' }[w] || w.toUpperCase();
      if (w === 'please') { t.tag = 'INTJ'; t.gloss = 'PLEASE'; }
      return i;
    }
    if (typeof W.NUMBERS[w] === 'number') { t.tag = 'NUM'; t.gloss = w.toUpperCase(); return i; }
    if (W.NUMBERS[w]) { t.tag = 'ADJ'; t.lemma = w; t.gloss = W.NUMBERS[w]; return i; }

    // open class: a name, verb, adjective, adverb or noun
    const pt = prev?.tag;
    if (isName(i)) { t.tag = 'NAME'; t.commonWord = isCommon(w); return i; }
    const vb = verbBase(w);
    const adj = adjBase(w);
    const adv = adverbBase(w);
    const nominalBefore = ['DET', 'POSS', 'NUM', 'QUANT', 'ADJ', 'DEM', 'NEGDET', 'INTENS'].includes(pt) || prev?.possessor;
    const auxBefore = ['PART', 'MODAL', 'AUX', 'FUT'].includes(pt) || ['NEG', 'FREQ'].includes(pt) && toks[i - 2] && ['AUX', 'MODAL'].includes(toks[i - 2].tag);
    const subjectBefore = (pt === 'NEG' || pt === 'FREQ') && toks[i - 2] && (toks[i - 2].tag === 'PRON' && toks[i - 2].subject || ['NAME', 'NOUN'].includes(toks[i - 2].tag)) || pt === 'PRON' && prev.subject || pt === 'NAME' || pt === 'NOUN' || pt === 'FREQ' || pt === 'EXIST' || (pt === 'ADV' && ['PRON', 'NAME', 'NOUN'].includes(toks[i - 2]?.tag)) || pt === 'REL';
    const nounAfter = next && !next.punct && !next.tag && (!verbBase(next.w) || verbForm(next.w) === 'base' || adjBase(next.w)) && !W.PREPOSITIONS.has(next.w) && !W.CONJUNCTIONS.has(next.w) && !W.TIME_WORDS[next.w] && !W.BE.has(next.w);
    const verb = (form) => { t.tag = 'VERB'; t.lemma = vb; t.form = form; seenVerb = true; phrasal(i); return i + (t.particle ? 1 : 0); };

    // a command: a bare verb before anything else ("Go home.", "Don't run!", "Please sit down.")
    if (open && !question && vb && verbForm(w) === 'base' && !nominalBefore && !verbAfterSubject(next)) return verb('imperative');
    if (adv && !vb && !(adj && !adverbBase(w))) { t.tag = 'ADV'; t.lemma = adv; return i; }
    // after do/does/will/can the verb is bare, whatever it looks like ("does it cost")
    if (auxBefore && vb) return verb(identicalPast(w) ? 'base' : verbForm(w));
    if (pt === 'BE') {
      // "I am hearing" (a hearing person) is the describing word; "I am hearing a noise" is the verb
      if (W.ADJECTIVES.has(w) && /ing$/.test(w) && !(next && !next.punct && (W.DETERMINERS.has(next.w) || W.POSSESSIVES[next.w] || W.PRONOUNS[next.w]))) { t.tag = 'ADJ'; t.lemma = w; return i; }
      if (vb && /ing$/.test(w)) return verb('ing');
      if (adj) { t.tag = 'ADJ'; t.lemma = adj; return i; }
      if (vb && verbForm(w) === 'past') return verb('passive');
    }
    if (nominalBefore) {
      if (adj && nounAfter) { t.tag = 'ADJ'; t.lemma = adj; return i; }
      if (adj && !nounAfter && !(next && !next.punct && !next.tag && !W.PREPOSITIONS.has(next.w))) { t.tag = pt === 'ADJ' || pt === 'DET' || pt === 'INTENS' ? 'ADJ' : 'NOUN'; t.lemma = adj; if (t.tag === 'NOUN') t.lemma = w; if (pt === 'DET' && !nounAfter) { t.tag = 'NOUN'; t.lemma = nounBase(w).base; } return i; }
    }
    if (!nominalBefore && subjectBefore && vb && !seenVerb && !(seenBe && verbForm(w) === 'base')) return verb(identicalPast(w) && (auxEarlier(i) || !thirdSingular(toks, i)) ? 'base' : verbForm(w));
    // "I cook and clean": a verb after "and" shares the subject when it joins two verbs
    if (!nominalBefore && pt === 'CONJ' && vb && (toks[i - 2]?.tag === 'VERB' || toks[i - 2]?.tag === 'PARTICLE' || next && (W.DETERMINERS.has(next.w) || W.POSSESSIVES[next.w] || W.PRONOUNS[next.w] && !W.SUBJECT_PRONOUNS.has(next.w)))) {
      return verb(verbForm(w) === 'base' ? 'base' : verbForm(w));
    }
    if (!nominalBefore && vb && !seenVerb && ['ing', 'past'].includes(verbForm(w)) && pt !== 'PREP') return verb(verbForm(w));
    if (adj && !nominalBefore) { t.tag = 'ADJ'; t.lemma = adj; return i; }
    if (adj && nominalBefore) { t.tag = nounAfter || pt === 'INTENS' ? 'ADJ' : 'NOUN'; t.lemma = t.tag === 'ADJ' ? adj : w; return i; }
    t.tag = 'NOUN';
    const nb = nounBase(w);
    t.lemma = nb.base;
    t.alt = nb.alt;
    t.plural = nb.plural && !W.PLACES.has(w);
    return i;
  }

  // Is this word a person's or a place's name?
  //  - a capital that is not the sentence's own first letter marks a name, unless the word is ordinary
  //    English that people capitalise anyway (Deaf, Mother, Sign name) and stands alone;
  //  - a run of capitals is one name even when its words are ordinary (Cape Town, Table Mountain);
  //  - at the start of a sentence only a word that is not ordinary English is a name (Thabo, not Porridge);
  //  - after "my name is" a name is expected, and after "I am" a word that is not ordinary English.
  function isName(i) {
    const t = toks[i];
    const w = t.w;
    if (W.CONVENTIONAL_CAPS.has(w)) return false;
    const slot = nameSlot(toks, i);
    if (slot === 'name') return true;
    const common = isCommon(w);
    const capWord = (x) => x && x.cap && !x.punct && !closedClass(x.w) && !W.CONVENTIONAL_CAPS.has(x.w) && x.w !== 'i';
    if (toks[i - 1]?.tag === 'NAME' && (t.cap || !common)) return true;
    if (!common) return t.cap || t.upper || slot === 'am';
    if (!t.cap) return false;
    const describes = adjBase(w) || /ing$/.test(w) && verbBase(w);
    return capWord(toks[i + 1]) || i !== firstWord && slot === 'am' && !describes;
  }

  // a verb and its particle are one sign: WAKE UP, LOOK FOR, FALL ASLEEP
  function phrasal(i) {
    const t = toks[i];
    const n = toks[i + 1];
    if (!n || n.punct || n.tag) return;
    const pair = `${t.lemma} ${n.w}`;
    if (!W.PHRASAL.has(pair) && !((PARTICLES.has(n.w) || ['asleep', 'awake'].includes(n.w)) && lex?.find(pair))) return;
    t.particle = n.w;
    n.tag = 'PARTICLE';
    n.of = t;
  }

  // a helper verb earlier in the clause carries the tense: "does it cost" is present
  function auxEarlier(i) {
    for (let k = i - 1; k >= 0; k--) {
      const x = toks[k];
      if (['CONJ', 'SUB'].includes(x.tag) || x.tag === 'PUNCT' && /[,;]/.test(x.w)) return false;
      if (['AUX', 'MODAL'].includes(x.tag)) return true;
    }
    return false;
  }
}

// cost, put, cut, hit: the past looks like the present, so only "it cost" (no -s) is past
function identicalPast(w) { return W.IRREGULAR[w] === w; }
function thirdSingular(toks, i) {
  const s = toks[i - 1]?.tag === 'FREQ' || toks[i - 1]?.tag === 'NEG' ? toks[i - 2] : toks[i - 1];
  return s && (['he', 'she', 'it'].includes(s.w) || s.tag === 'NAME' || s.tag === 'NOUN' && !s.plural);
}

const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = ',,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety'.split(',');
/** 25 -> "TWENTY FIVE", as the dictionary writes its number signs. */
function numberWords(n) {
  if (n < 20) return ONES[n].toUpperCase();
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`.toUpperCase();
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100).toLowerCase()}` : ''}`.toUpperCase();
}

// ---------------------------------------------------------------- clauses

function splitClauses(toks) {
  const clauses = [];
  let cur = { toks: [], marker: null };
  const hasVerb = (arr) => arr.some((t) => ['VERB', 'BE'].includes(t.tag));
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const rest = toks.slice(i + 1);
    const complement = cur.toks.some((x) => x.tag === 'VERB' && PERCEPTION_COMPLEMENT.has(x.lemma));
    if (complement && (t.tag === 'COMP' || t.tag === 'PRON' && rest[0]?.tag === 'BE')) {
      clauses.push(cur);
      cur = { toks: t.tag === 'COMP' ? [] : [t], marker: t.tag === 'COMP' ? t : null };
      continue;
    }
    const restUntilBreak = [];
    for (const r of rest) { if (['CONJ', 'SUB'].includes(r.tag) || r.w === ';') break; restUntilBreak.push(r); }
    if ((t.tag === 'SUB' || t.tag === 'CONJ') && hasVerb(restUntilBreak) && (t.tag === 'SUB' || hasVerb(cur.toks))) {
      if (cur.toks.length) clauses.push(cur);
      cur = { toks: [], marker: t };
      continue;
    }
    if (t.w === ';' || (t.w === ',' && cur.marker?.tag === 'SUB' && hasVerb(cur.toks) && hasVerb(rest))) {
      if (cur.toks.length) clauses.push(cur);
      cur = { toks: [], marker: null, afterComma: true };
      continue;
    }
    cur.toks.push(t);
  }
  if (cur.toks.length || cur.marker) clauses.push(cur);
  return clauses;
}

// Collect phrases in a clause: noun phrases, prepositional phrases, the verb group.
function phrases(toks) {
  const out = [];
  const NP_PARTS = new Set(['DET', 'POSS', 'NUM', 'QUANT', 'ADJ', 'NOUN', 'NAME', 'PRON', 'DEM', 'NEGDET', 'INTENS']);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.tag === 'PREP' && toks[i + 1] && NP_PARTS.has(toks[i + 1].tag)) {
      const np = readNP(toks, i + 1);
      out.push({ kind: 'PP', prep: t, np, at: i });
      i = np.end - 1;
      continue;
    }
    if (NP_PARTS.has(t.tag)) {
      const np = readNP(toks, i);
      out.push({ kind: 'NP', np, at: i });
      i = np.end - 1;
      continue;
    }
    out.push({ kind: t.tag, tok: t, at: i });
  }
  return out;
}

function readNP(toks, i) {
  const parts = [];
  let j = i;
  const ok = new Set(['DET', 'POSS', 'NUM', 'QUANT', 'ADJ', 'NOUN', 'NAME', 'DEM', 'NEGDET', 'INTENS']);
  if (toks[j]?.tag === 'PRON') return { parts: [toks[j]], end: j + 1, head: toks[j] };
  while (toks[j] && ok.has(toks[j].tag)) {
    parts.push(toks[j]);
    const t = toks[j];
    j++;
    // a noun (or name) followed by a determiner-less new noun phrase ends here unless it is a compound
    if (['NOUN', 'NAME'].includes(t.tag) && !t.possessor && toks[j] && ['DET', 'POSS', 'DEM'].includes(toks[j].tag)) break;
  }
  // "of" + noun phrase joins: a cup of tea
  if (toks[j]?.w === 'of' && toks[j + 1] && ok.has(toks[j + 1].tag)) {
    const tail = readNP(toks, j + 1);
    return { parts: [...parts, ...tail.parts], end: tail.end, head: tail.head, of: true };
  }
  const nouns = parts.filter((p) => ['NOUN', 'NAME'].includes(p.tag));
  return { parts, end: j, head: nouns[nouns.length - 1] || parts[parts.length - 1] };
}

// ---------------------------------------------------------------- signs

function signsForNP(np, role, lex, ctx) {
  const out = [];
  // Dictionary compounds name one concept; don't reorder their internal adjectives.
  const parts = [...np.parts];
  for (let i = 0; i + 1 < parts.length; i++) {
    const a = parts[i], b = parts[i + 1];
    if (a.tag === 'ADJ' && b.tag === 'NOUN') {
      const phrase = `${a.lemma || a.w} ${b.lemma || b.w}`;
      if (lex.find(phrase)) parts.splice(i, 2, { ...b, w: phrase, lemma: phrase,
        wis: [...(a.wis || [a.wi]), ...(b.wis || [b.wi])] });
    }
  }
  np = { ...np, parts };
  const nouns = [];
  const describe = [];
  const before = [];
  for (const p of np.parts) {
    if (p.tag === 'DET') { ctx.drop(p, 'articles'); continue; }
    if (p.tag === 'NEGDET') { ctx.negate(p); continue; }
    if (p.tag === 'ADJ' || p.tag === 'INTENS') { describe.push(p); continue; }
    if (p.tag === 'NOUN' || p.tag === 'NAME') { nouns.push(p); continue; }
    before.push(p);
  }
  const counts = before.filter((p) => ['NUM', 'QUANT'].includes(p.tag) && nouns.length);
  for (const p of before) {
    if (counts.includes(p)) continue;
    if (p.tag === 'DEM') { ctx.rule('point'); out.push(ctx.sign(p, { gloss: p.gloss, role, point: true, rule: 'point', sub: `point: ${p.w}` })); }
    else if (p.tag === 'PRON') out.push(ctx.pronoun(p, role));
    else if (p.tag === 'POSS' && ['HIS', 'HER', 'ITS', 'THEIR'].includes(p.gloss)) {
      ctx.rule('possess');
      out.push(ctx.sign(p, { gloss: p.gloss, role, point: true, rule: 'possess', sub: 'A-hand toward them', kind: 'possess' }));
    } else out.push(ctx.sign(p, { gloss: p.gloss || p.w.toUpperCase(), role, number: p.tag === 'NUM', kind: p.tag === 'POSS' ? 'possess' : undefined }));
  }
  // a run of name words is one name: Cape Town
  for (let q = nouns.length - 1; q > 0; q--) {
    if (nouns[q].tag === 'NAME' && nouns[q - 1].tag === 'NAME') {
      const a = nouns[q - 1];
      nouns.splice(q - 1, 2, { ...a, w: `${a.w} ${nouns[q].w}`, text: `${a.text} ${nouns[q].text}`, wis: [...(a.wis || [a.wi]), ...(nouns[q].wis || [nouns[q].wi])] });
    }
  }
  // compound nouns: try the longest dictionary match first ("BUS STOP")
  let k = 0;
  while (k < nouns.length) {
    let matched = 0;
    for (let n = Math.min(nouns.length - k, 3); n > 1; n--) {
      const g = nouns.slice(k, k + n).map((x) => (x.lemma || x.w).toUpperCase()).join(' ');
      if (lex.find(g)) { out.push(ctx.sign(nouns.slice(k, k + n), { gloss: g, role })); matched = n; break; }
    }
    if (matched) { k += matched; continue; }
    const n = nouns[k];
    if (n.tag === 'NAME') out.push(ctx.name(n, role));
    else {
      const surface = n.w.toUpperCase();
      const base = (n.lemma || n.w).toUpperCase();
      const gloss = lex.find(surface) && n.plural ? surface : !lex.find(base) && n.alt && lex.find(n.alt.toUpperCase()) ? n.alt.toUpperCase() : base;
      const s = ctx.sign(n, { gloss, role });
      if (n.plural && !np.parts.some((p) => ['NUM', 'QUANT'].includes(p.tag)) && gloss !== surface) { s.plural = true; ctx.rule('plural'); }
      out.push(s);
    }
    k++;
  }
  // Keep intensifiers attached to the adjective they qualify while ordering colours first.
  const groups = [];
  for (const a of describe) {
    if (groups.at(-1)?.at(-1)?.tag === 'INTENS') groups.at(-1).push(a);
    else groups.push([a]);
  }
  groups.sort((a, b) => Number(COLOURS.has(b.at(-1).lemma)) - Number(COLOURS.has(a.at(-1).lemma)));
  describe.splice(0, describe.length, ...groups.flat());
  for (const a of describe) {
    const g = typeof a.gloss === 'string' && a.gloss ? a.gloss : (a.lemma || a.w).toUpperCase();
    const s = ctx.sign(a, { gloss: g, role, kind: 'describe' });
    if (nouns.length) { s.rule = 'adj'; ctx.rule('adj'); s.sub = COLOURS.has(a.lemma) ? 'colour' : `describes ${nouns[nouns.length - 1].w}`; }
    out.push(s);
  }
  for (const p of counts) {
    const s = ctx.sign(p, { gloss: p.gloss || p.w.toUpperCase(), role, number: p.tag === 'NUM', kind: 'describe' });
    s.rule = 'adj'; s.sub = 'how many'; ctx.rule('adj');
    out.push(s);
  }
  return out;
}

function analyseClause(clause, lex, ctx, sentence) {
  const toks = clause.toks;
  const units = { time: [], place: [], relation: [], subject: [], recipient: [], object: [], modal: [], verb: [], how: [], other: [], neg: [], wh: [], intj: [], freq: [], link: [] };
  const P = phrases(toks);
  const beIdx = P.findIndex((p) => p.kind === 'BE');
  // "The man who lives next door is a teacher": no source covers relative
  // clauses, so the clause stays in English order after its noun and "is" is the main verb
  const relIdx = P.findIndex((p, k) => p.kind === 'REL' && P[k - 1]?.kind === 'NP');
  const relVerb = relIdx >= 0 ? P.findIndex((p, k) => k > relIdx && p.kind === 'VERB') : -1;
  const relative = relVerb > relIdx && beIdx > relVerb ? { from: relIdx + 1, to: beIdx } : null;
  const verbIdx = P.findIndex((p, k) => p.kind === 'VERB' && (!relative || k > beIdx));
  const pivot = verbIdx >= 0 ? verbIdx : beIdx;
  const mainVerb = verbIdx >= 0 ? P[verbIdx].tok : null;
  let subjectSet = false;
  let passive = mainVerb?.form === 'passive';
  let rough = false;
  let existential = false;
  let lastUnit = null;
  let joinNext = null;

  let beforeRelative = null;
  for (let k = 0; k < P.length; k++) {
    const p = P[k];
    const beforeVerb = pivot < 0 || k < pivot;
    const sizes = Object.fromEntries(Object.entries(units).map(([n, a]) => [n, a.length]));
    if (relative && k === relative.from) beforeRelative = new Set(Object.values(units).flat());
    analysePhrase(p, k, beforeVerb);
    if (p.kind === 'NP') {
      const grew = Object.entries(units).find(([n, a]) => a.length > sizes[n]);
      lastUnit = grew ? grew[1] : lastUnit;
    }
    if (relative && k === relative.to - 1) {
      const moved = [];
      for (const arr of Object.values(units)) {
        const keep = arr.filter((x) => beforeRelative.has(x));
        moved.push(...arr.filter((x) => !beforeRelative.has(x)));
        arr.splice(0, arr.length, ...keep);
      }
      const at = (x) => Math.min(...(x.words?.length ? x.words : [Infinity]));
      units.subject.push(...moved.sort((a, b) => at(a) - at(b)));
      ctx.rule('kept');
    }
  }
  function analysePhrase(p, k, beforeVerb) {
    switch (p.kind) {
      case 'TIME': {
        const t = p.tok;
        // "My birthday is in May": after "to be", with nothing else said, the time is the comment
        if (pivot === beIdx && verbIdx < 0 && k > beIdx && P.slice(beIdx + 1).every((q) => ['TIME', 'PUNCT'].includes(q.kind))) {
          t.parts.forEach((g, n) => units.object.push(ctx.sign(n === 0 ? t : { ...t, silent: true }, { gloss: g, role: 'describe', kind: 'describe', rule: 'adj' })));
          ctx.dropExtra(t, 'time');
          ctx.rule('adj');
          break;
        }
        const signs = [];
        const whole = lex.find(t.w.toUpperCase().replace(/\b(IN|ON|AT|THE|DURING|OVER)\b/g, '').trim());
        if (whole && t.parts.length > 1) signs.push(ctx.sign(t, { gloss: glossKey(whole), role: 'time', rule: 'time' }));
        else t.parts.forEach((g, n) => signs.push(ctx.sign(n === 0 ? t : { ...t, silent: true }, { gloss: g, role: 'time', rule: 'time', number: /^\d/.test(g) })));
        ctx.dropExtra(t, 'time');
        units.time.push(...signs);
        ctx.rule('time');
        if (t.past) ctx.tense('past', true);
        if (t.future) ctx.tense('future', true);
        if (['YESTERDAY', 'PAST', 'LAST', 'AGO', 'BEFORE'].some((x) => t.parts.includes(x))) ctx.tense('past', true);
        if (['TOMORROW', 'NEXT', 'FUTURE', 'LATER', 'SOON', 'TONIGHT'].some((x) => t.parts.includes(x))) ctx.tense('future', true);
        if (['TODAY', 'NOW', 'EVERY', 'THIS'].some((x) => t.parts.includes(x))) ctx.tense('present', true);
        break;
      }
      case 'FREQ': (p.at === 0 ? units.time : units.freq).push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: 'verb', rule: 'kept' })); ctx.rule('kept'); break;
      case 'WH': units.wh.push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: 'question', rule: 'wh' })); ctx.rule('wh'); break;
      case 'NEG': ctx.negate(p.tok); break;
      case 'INTJ': units.intj.push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: 'greeting' })); break;
      case 'EXIST': ctx.drop(p.tok, 'be'); existential = true; break;
      case 'BE': ctx.drop(p.tok, 'be'); ctx.rule('be'); if (p.tok.form === 'past') ctx.tense('past'); break;
      case 'AUX': ctx.drop(p.tok, 'aux'); ctx.rule('aux'); if (p.tok.form === 'past' || p.tok.form === 'perfect') ctx.tense('past'); break;
      case 'FUT': ctx.drop(p.tok, 'aux'); ctx.rule('aux'); ctx.tense('future'); break;
      case 'PART': ctx.drop(p.tok, 'to'); ctx.rule('to'); break;
      case 'COMP': ctx.drop(p.tok, 'kept'); break;
      case 'REL': rough = true; ctx.drop(p.tok, 'kept'); break;
      case 'PARTICLE': {
        if (p.tok.of) break;
        const v = units.verb[units.verb.length - 1];
        if (v && lex.find(`${v.gloss} ${p.tok.w.toUpperCase()}`)) { v.gloss = glossKey(lex.find(`${v.gloss} ${p.tok.w.toUpperCase()}`)); v.entry = lex.find(v.gloss); v.words.push(p.tok.wi); ctx.claim(p.tok, v); }
        else ctx.drop(p.tok, 'kept');
        break;
      }
      case 'MODAL': {
        const t = p.tok;
        if (t.future) { ctx.drop(t, 'aux'); ctx.rule('aux'); ctx.tense('future'); break; }
        if (t.w === 'would' || t.w === 'could' && !t.cant) { ctx.drop(t, 'aux'); ctx.rule('aux'); break; }
        if (t.cant) { ctx.cant = t; break; }
        units.modal.push(ctx.sign(t, { gloss: t.gloss, role: 'verb', kind: 'modal' }));
        break;
      }
      case 'VERB': {
        const t = p.tok;
        // SIT already goes down: a particle that only repeats the verb's direction is not a second sign
        const redundant = REDUNDANT_PARTICLE.has(`${t.lemma} ${t.particle}`) && lex.find(t.lemma.toUpperCase()) && !lex.find(`${t.lemma} ${t.particle}`.toUpperCase());
        const g = [t.lemma || t.w, redundant ? null : t.particle].filter(Boolean).join(' ').toUpperCase();
        const particle = t.particle && toks.find((x) => x.of === t);
        const s = ctx.sign(particle ? [t, particle] : t, { gloss: g, role: 'verb' });
        if (t.form === 'past') ctx.tense('past');
        if (t.form !== 'base' && t.form !== 'imperative' && s.gloss !== t.w.toUpperCase()) { s.rule = 'tense'; }
        if (GIVING.has(t.lemma)) { s.rule = 'directional'; ctx.rule('directional'); }
        units.verb.push(s);
        break;
      }
      case 'ADV': {
        const t = p.tok;
        const g = t.gloss || (t.lemma || t.w).toUpperCase();
        (t.w === 'also' ? units.freq : units.how).push(ctx.sign(t, { gloss: g, role: 'verb', kind: 'describe' }));
        break;
      }
      case 'PREP': {
        if (['at', 'in', 'to'].includes(p.tok.w) && P[k + 1]?.kind === 'PLACEADV') ctx.drop(p.tok, 'place');
        else units.other.push(ctx.sign(p.tok, { gloss: p.tok.w.toUpperCase(), role: 'place', rule: 'kept' }));
        break;
      }
      case 'PLACEADV': units.place.push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: 'place', rule: 'place' })); ctx.rule('place'); break;
      case 'CONJ': case 'SUB': {
        const prevNP = P[k - 1]?.kind === 'NP' && P[k + 1]?.kind === 'NP';
        if (prevNP && lastUnit) { lastUnit.push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: lastUnit[0]?.role || 'subject', kind: 'link' })); joinNext = lastUnit; break; }
        units.link.push(ctx.sign(p.tok, { gloss: p.tok.gloss, role: 'link' }));
        break;
      }
      case 'PUNCT': break;
      case 'PP': {
        const prep = p.prep.w;
        const head = p.np.head;
        const isPlace = head && (W.PLACES.has(head.w) || W.PLACES.has(head.lemma) || head.tag === 'NAME' && (W.PLACE_PREPS.has(prep) && (mainVerb && MOTION.has(mainVerb.lemma) || ['in', 'at', 'from'].includes(prep))));
        if (passive && prep === 'by') {
          ctx.drop(p.prep, 'kept');
          units.subject.unshift(...signsForNP(p.np, 'subject', lex, ctx));
          subjectSet = true;
          break;
        }
        if (prep === 'by' && head && ['bus', 'car', 'taxi', 'train', 'plane', 'bike', 'bicycle', 'boat', 'foot'].includes(head.lemma || head.w)) {
          ctx.drop(p.prep, 'kept');
          units.how.push(...signsForNP(p.np, 'other', lex, ctx));
          break;
        }
        if (prep === 'to' && mainVerb && GIVING.has(mainVerb.lemma) && !isPlace) {
          ctx.drop(p.prep, 'directional');
          units.recipient.push(...signsForNP(p.np, 'object', lex, ctx));
          break;
        }
        if (isPlace && ['to', 'at', 'in', 'into'].includes(prep)) {
          ctx.drop(p.prep, 'place');
          units.place.push(...signsForNP(p.np, 'place', lex, ctx));
          ctx.rule('place');
          break;
        }
        if (isPlace || ['under', 'on', 'behind', 'above', 'below', 'beside', 'between', 'near', 'inside', 'outside', 'next'].includes(prep) && head?.tag !== 'PRON') {
          const np = signsForNP(p.np, 'place', lex, ctx);
          const rel = ctx.sign(p.prep, { gloss: prep.toUpperCase(), role: 'place', rule: prep === 'from' ? 'place' : 'space' });
          units.place.push(...np);
          (prep === 'from' ? units.place : units.relation).push(rel);
          ctx.rule(prep === 'from' ? 'place' : 'space');
          break;
        }
        const np = signsForNP(p.np, 'other', lex, ctx);
        const ps = ctx.sign(p.prep, { gloss: prep.toUpperCase(), role: 'other', rule: 'kept' });
        units.other.push(ps, ...np);
        break;
      }
      case 'NP': {
        const np = p.np;
        if (joinNext) { const role = joinNext[0]?.role || 'subject'; joinNext.push(...signsForNP(np, role, lex, ctx)); joinNext = null; break; }
        if (np.parts.length === 1 && np.head.w === 'it' && toks.some((x) => x.tag === 'WH' && x.gloss === 'WHAT-TIME')) { ctx.drop(np.head, 'dummy'); subjectSet = true; break; }
        if (beforeVerb && toks[0]?.tag === 'WH' && P.slice(k + 1, pivot).some((q) => q.kind === 'NP' && q.np.head.tag === 'PRON' && q.np.head.subject)) {
          units.object.push(...signsForNP(np, 'object', lex, ctx)); break;
        }
        if (np.parts.length === 1 && np.head.tag === 'PRON' && !beforeVerb && pivot >= 0 && beIdx === pivot && units.subject.length === 0) {
          // "Are you deaf?" - the subject after an inverted "to be"
          units.subject.push(...signsForNP(np, 'subject', lex, ctx)); subjectSet = true; break;
        }
        const weatherAdj = pivot === beIdx && verbIdx < 0 && P.slice(k + 1).some((q) => q.kind === 'ADJ' && WEATHER_ADJ.has(q.tok.lemma)
          || q.kind === 'NP' && q.np.parts.every((x) => ['ADJ', 'INTENS'].includes(x.tag)) && q.np.parts.some((x) => WEATHER_ADJ.has(x.lemma)));
        if (!subjectSet && np.parts.length === 1 && np.head.w === 'it' && (mainVerb && WEATHER.has(mainVerb.lemma) || weatherAdj || toks.some((x) => x.tag === 'WH' && x.gloss === 'WHAT-TIME'))) {
          ctx.drop(np.head, 'dummy'); subjectSet = true; break;
        }
        if (beforeVerb && !subjectSet) {
          if (pivot < 0 && units.subject.length === 0 && !existential) { units.subject.push(...signsForNP(np, 'subject', lex, ctx)); subjectSet = true; break; }
          units.subject.push(...signsForNP(np, 'subject', lex, ctx));
          subjectSet = true;
          break;
        }
        if (existential && !subjectSet) { units.subject.push(...signsForNP(np, 'subject', lex, ctx)); subjectSet = true; break; }
        if (!beforeVerb && pivot === beIdx && verbIdx < 0) {
          if (!subjectSet && !P[beIdx]?.tok.imperative) {
            const descAt = np.parts.findIndex((t, i) => i > 0 && t.tag === 'ADJ' && np.parts.slice(0, i).some((x) => x.tag === 'NOUN'));
            if (descAt >= 0) {
              units.subject.push(...signsForNP({ ...np, parts: np.parts.slice(0, descAt) }, 'subject', lex, ctx));
              units.object.push(...signsForNP({ ...np, parts: np.parts.slice(descAt) }, 'describe', lex, ctx));
            } else units.subject.push(...signsForNP(np, 'subject', lex, ctx));
            subjectSet = true; break;
          }
          units.object.push(...signsForNP(np, 'describe', lex, ctx));
          break;
        }
        if (passive && !subjectSet) { units.object.push(...signsForNP(np, 'object', lex, ctx)); break; }
        if (!beforeVerb && mainVerb && GIVING.has(mainVerb.lemma) && units.object.length === 0 && P.slice(k + 1).some((q) => q.kind === 'NP') && np.head?.tag !== 'NOUN') {
          units.recipient.push(...signsForNP(np, 'object', lex, ctx));
          break;
        }
        if (beforeVerb && subjectSet) { units.subject.push(...signsForNP(np, 'subject', lex, ctx)); break; }
        units.object.push(...signsForNP(np, 'object', lex, ctx));
        break;
      }
      case 'ADJ': {
        const t = p.tok;
        units.object.push(ctx.sign(t, { gloss: (typeof t.gloss === 'string' ? t.gloss : (t.lemma || t.w).toUpperCase()), role: 'describe', kind: 'describe' }));
        break;
      }
      default:
        if (p.tok) ctx.drop(p.tok, 'kept');
    }
  }
  if (passive) rough = rough || !units.subject.length;
  if (P.filter((p) => p.kind === 'VERB').length > 2) rough = true;
  return { units, rough, copula: pivot === beIdx && verbIdx < 0 };
}

// ---------------------------------------------------------------- the sentence

// "?", "??" and "?!" end a question
function looksLikeQuestion(text) { return /\?[?!.\s]*$/.test(text) && /[A-Za-z0-9]/.test(text); }

// A question without its question mark, as people type in chat: a question word that opens the
// sentence and is not joining a clause ("where do you live", but not "when I was young, ..."), or a
// helper verb before its subject ("did you go", "are you deaf", "can you help").
function asksByWordOrder(toks) {
  const i = toks.findIndex((t) => !t.punct && !W.GREETINGS[t.w] && t.tag !== 'INTJ');
  const t = toks[i];
  const n = toks.slice(i + 1).find((x) => x.w !== 'not');
  if (!t) return false;
  const subject = (x) => x && !x.punct && (W.PRONOUNS[x.w] && x.w !== 'me' || W.DETERMINERS.has(x.w) || W.POSSESSIVES[x.w] || x.w === 'there' || x.cap);
  if (W.WH[t.w] || t.tag === 'WH') {
    if (!n || n.punct) return true;
    // "when I was young" and "where I live" join a clause; "what time is it" and "who lives here" ask
    return !subject(n) || W.BE.has(n.w);
  }
  if (W.BE.has(t.w) && t.w !== 'be' || W.MODALS[t.w] || ['do', 'does', 'did'].includes(t.w)) {
    if (!subject(n)) return false;
    // "do your homework" is a command: a question has its own verb after the subject
    return !W.DO.has(t.w) || toks.slice(i + 2).some((x) => verbBase(x.w) && !W.DETERMINERS.has(x.w));
  }
  if (['have', 'has', 'had'].includes(t.w)) return !!n && (W.PRONOUNS[n.w] && n.w !== 'me') && toks.slice(i + 2).some((x) => /ed$|en$/.test(x.w) || x.w === 'got' || W.IRREGULAR[x.w]);
  return false;
}

/**
 * One sentence. `state` carries the time set by earlier sentences in the
 * same paragraph ({ tense }), so a time sign is not repeated needlessly.
 */
export function buildSentence(text, lex, state = {}) {
  const { words, toks: raw } = tokenize(text);
  const joined = joinPhrases(raw);
  const question = looksLikeQuestion(text) || asksByWordOrder(joined);
  const toks = tag(joined, question, lex);
  const signs = [];
  const fate = words.map((w) => (w.punct ? { punct: true } : null));
  const rules = [];
  const negated = [];
  let tense = null;
  let tenseFromTime = false;

  const ctx = {
    rule(id) { if (!rules.includes(id)) rules.push(id); },
    sign(tok, o) {
      const list = Array.isArray(tok) ? tok : [tok];
      const wis = [...new Set(list.flatMap((t) => (t.silent ? [] : t.wis || [t.wi])))];
      const s = { gloss: o.gloss, role: o.role, kind: o.kind || 'sign', words: wis, rule: o.rule || null, sub: o.sub || null };
      if (o.point) s.point = true;
      if (o.number || /^\d/.test(o.gloss)) { s.number = true; s.state = 'number'; }
      else {
        const entry = lex.find(o.gloss);
        if (entry) { s.entry = entry; s.state = 'sign'; s.variants = lex.all(o.gloss).length; }
        else s.state = o.point ? 'point' : 'missing';
      }
      for (const wi of wis) if (!fate[wi]?.sign) fate[wi] = { sign: s };
      return s;
    },
    claim(tok, s) { for (const wi of tok.wis || [tok.wi]) if (!fate[wi]?.sign) fate[wi] = { sign: s }; },
    drop(tok, why) { for (const wi of tok.wis || [tok.wi]) if (!fate[wi]) fate[wi] = { drop: why }; },
    dropExtra(tok) { for (const f of tok.fn || []) fate[f.wi] = { drop: f.why }; },
    pronoun(tok, role) {
      const g = tok.gloss;
      if (W.POINTED.has(g) || tok.point) {
        ctx.rule('point');
        return ctx.sign(tok, { gloss: g, role, point: true, rule: 'point', sub: `point to ${g === 'IT' ? 'it' : g === 'THEY' ? 'them' : g === 'HE' ? 'him' : 'her'}` });
      }
      return ctx.sign(tok, { gloss: g, role });
    },
    name(tok, role) {
      const entry = lex.find(tok.w.toUpperCase());
      if (entry) return ctx.sign(tok, { gloss: tok.w.toUpperCase(), role });
      ctx.rule('spell');
      const s = ctx.sign(tok, { gloss: tok.text.replace(/'s$/i, '').replace(/[’']/g, '').toUpperCase(), role, rule: 'spell' });
      s.state = 'spell';
      s.spell = s.gloss.replace(/[^A-Z ]/g, '').trim();
      delete s.entry;
      return s;
    },
    negate(tok) { negated.push(tok); },
    tense(t, fromTime = false) { if (ctx.inSub) return; if (fromTime) { tense = t; tenseFromTime = true; } else if (!tenseFromTime && !tense) tense = t; },
  };

  const clauses = splitClauses(toks);
  const built = clauses.map((c) => {
    ctx.inSub = !!(c.marker && c.marker.tag === 'SUB' && !['if', 'when', 'whenever', 'unless'].includes(c.marker.w));
    const r = { clause: c, ...analyseClause(c, lex, ctx, text) };
    ctx.inSub = false;
    return r;
  });
  // time from the main clauses opens the sentence; a subordinate clause keeps its own
  const fronted = (b) => !b.clause.marker || b.clause.marker.tag === 'CONJ';

  // assemble: condition clauses first, then the rest in their English order
  const conditionFirst = built.filter((b) => b.clause.marker && ['if', 'when', 'whenever', 'unless'].includes(b.clause.marker.w) && !question);
  const remaining = built.filter((b) => !conditionFirst.includes(b));
  // A leading reason follows its main clause as a rhetorical WHY.
  if (remaining[0]?.clause.marker?.w === 'because' && remaining.length > 1) remaining.push(remaining.shift());
  const order = [...conditionFirst, ...remaining];
  const marks = [];
  const allTime = order[0]?.units.time || [];
  const intj = built.flatMap((b) => b.units.intj).filter(bFirstWord);
  function bFirstWord(s) {
    const firstContent = toks.find((t) => !['PUNCT', 'INTJ', 'TIME'].includes(t.tag));
    return s.gloss !== 'SEE YOU' && (!firstContent || Math.min(...s.words) < firstContent.wi);
  }
  signs.push(...intj);
  const timeStart = signs.length;
  signs.push(...allTime);
  let added = null;
  // FINISH already says the action is done, so no PAST is added before it
  const finished = built.some((b) => b.units.verb.some((v) => v.gloss === 'FINISH'));
  if (!allTime.length && (tense === 'past' || tense === 'future') && !(tense === 'past' && finished)) {
    if (state.tense === tense) { ctx.rule('timeKept'); }
    else {
      added = { gloss: tense === 'past' ? 'PAST' : 'FUTURE', role: 'time', kind: 'sign', words: [], rule: 'tense', added: true, sub: 'added: sets the tense' };
      const entry = lex.find(added.gloss);
      if (entry) { added.entry = entry; added.state = 'sign'; } else added.state = 'missing';
      signs.push(added);
      ctx.rule('tense');
    }
  }
  if (allTime.length || added) ctx.rule('time');
  let hasObject = false;
  const altSigns = [...signs];
  for (const b of order) {
    const u = b.units;
    const start = signs.length;
    const isCond = conditionFirst.includes(b);
    if (b.clause.marker) {
      const m = b.clause.marker;
      if (isCond) { ctx.drop(m, 'condition'); ctx.rule('condition'); }
    }
    const link = u.link.filter((s) => !(isCond && ['IF', 'WHEN', 'WHENEVER'].includes(s.gloss)));
    let rhetorical = null;
    if (b.clause.marker && !isCond && b.clause.marker.w === 'because' && !question) {
      rhetorical = ctx.sign(b.clause.marker, { gloss: 'WHY', role: 'question', rule: 'because', sub: 'eyebrows up, then answer' });
      ctx.rule('because');
      link.unshift(rhetorical);
    } else if (b.clause.marker?.tag === 'COMP') {
      ctx.drop(b.clause.marker, 'kept');
    } else if (b.clause.marker && !isCond) {
      const s = ctx.sign(b.clause.marker, { gloss: b.clause.marker.w.toUpperCase(), role: 'link' });
      link.unshift(s);
    }
    const v0 = u.verb[0];
    if (v0 && LINKING.has(v0.gloss.toLowerCase()) && u.object.length && (v0.gloss === 'BECOME' || u.object.every((o) => o.kind === 'describe'))) {
      u.how.unshift(...u.object.map((o) => ({ ...o, role: 'describe' })));
      for (const o of u.how) for (const wi of o.words) if (fate[wi]?.sign && u.object.includes(fate[wi].sign)) fate[wi] = { sign: o };
      u.object.length = 0;
    }
    const perfect = b.clause.toks.some((t) => t.tag === 'AUX' && t.form === 'perfect');
    if (v0 && v0.rule === 'directional') {
      for (const unit of [u.recipient, u.object]) {
        const pr = unit.length === 1 && ['ME', 'YOU', 'HE', 'SHE', 'THEY', 'WE'].includes(unit[0].gloss) ? unit[0] : null;
        if (!pr) continue;
        const to = { ME: 'me', YOU: 'you', HE: 'him', SHE: 'her', THEY: 'them', WE: 'us' }[pr.gloss];
        const fused = lex.find(`${v0.gloss} ${pr.gloss}`) || lex.find(`${v0.gloss} ${to.toUpperCase()}`);
        const sp = u.subject.length === 1 && ['ME', 'YOU', 'HE', 'SHE', 'THEY', 'WE'].includes(u.subject[0].gloss) ? u.subject[0] : null;
        const from = sp && { ME: 'me', YOU: 'you', HE: 'him', SHE: 'her', THEY: 'them', WE: 'us' }[sp.gloss];
        if (fused) { v0.gloss = glossKey(fused); v0.entry = fused; v0.state = 'sign'; }
        v0.sub = from ? `from ${from} toward ${to}` : `move it toward ${to}`;
        for (const x of sp ? [pr, sp] : [pr]) { for (const wi of x.words) fate[wi] = { sign: v0 }; v0.words.push(...x.words); }
        unit.length = 0;
        if (sp) u.subject.length = 0;
      }
    }
    if (v0 && v0.rule !== 'directional' && u.object.length === 1 && ['ME', 'YOU', 'HE', 'SHE', 'THEY', 'WE'].includes(u.object[0].gloss)) {
      const pr = u.object[0];
      const fused = lex.find(`${v0.gloss} AT ${pr.gloss}`) || lex.find(`${v0.gloss} ${pr.gloss}`);
      if (fused) {
        v0.gloss = glossKey(fused); v0.entry = fused; v0.state = 'sign';
        for (const wi of pr.words) fate[wi] = { sign: v0 };
        v0.words.push(...pr.words);
        u.object.length = 0;
      }
    }
    const negHere = negated.filter((t) => b.clause.toks.includes(t));
    const verbs = [...u.modal, ...u.verb];
    let negSigns = [];
    if (isCond && b.clause.marker.w === 'unless') {
      negSigns.push({ gloss: 'NOT', role: 'neg', kind: 'sign', state: lex.find('NOT') ? 'sign' : 'missing', entry: lex.find('NOT'), words: [], rule: 'neg', added: true });
      ctx.rule('neg');
    }
    if (negHere.length || (ctx.cant && b.clause.toks.includes(ctx.cant))) {
      ctx.rule('neg');
      const v = u.verb[0];
      const incorporated = v && lex.find(`DON'T ${v.gloss}`) || v && lex.find(`${v.gloss}N'T`);
      if (perfect && negHere.every((t) => t.w === 'not') && lex.find('NOT YET')) {
        const s = ctx.sign(negHere[0], { gloss: 'NOT YET', role: 'neg', rule: 'neg', sub: `from "${negHere[0].text}"` });
        for (const t of negHere) ctx.claim(t, s);
        negSigns = [s];
      } else if (ctx.cant && b.clause.toks.includes(ctx.cant)) {
        const s = ctx.sign(ctx.cant, { gloss: "CAN'T", role: 'neg', rule: 'negSign' });
        ctx.rule('negSign');
        for (const t of negHere) ctx.claim(t, s);
        negSigns = [s];
      } else if (incorporated && negHere.every((t) => t.w === 'not' || t.w === 'no' && v.gloss === 'HAVE')) {
        v.gloss = glossKey(incorporated); v.entry = incorporated; v.state = 'sign'; v.rule = 'negSign'; v.role = 'neg';
        for (const t of negHere) ctx.claim(t, v);
        ctx.rule('negSign');
      } else {
        negSigns = negHere.map((t) => ctx.sign(t, { gloss: t.gloss || 'NOT', role: 'neg', rule: 'neg', sub: t.contracted ? `from "${t.text}"` : null }));
      }
    }
    const partsInOrder = [
      ...link,
      ...(b === order[0] ? [] : u.time),
      ...u.place,
      ...u.subject,
      ...u.freq.filter((s) => s.gloss !== 'AGAIN'),
      ...u.relation,
      ...u.recipient,
      ...u.object,
      ...verbs,
      ...u.how,
      ...u.freq.filter((s) => s.gloss === 'AGAIN'),
      ...u.other,
      ...negSigns,
      ...u.wh,
      ...u.intj.filter((s) => !intj.includes(s)),
    ];
    signs.push(...partsInOrder);
    // English-like alternative: object after the verb
    altSigns.push(...link, ...(b === order[0] ? [] : u.time), ...u.place, ...u.subject, ...u.freq.filter((s) => s.gloss !== 'AGAIN'), ...u.relation, ...verbs, ...u.recipient, ...u.object, ...u.how, ...u.freq.filter((s) => s.gloss === 'AGAIN'), ...u.other, ...negSigns, ...u.wh, ...u.intj.filter((s) => !intj.includes(s)));
    if (u.object.length && verbs.length && u.object.some((o) => o.role === 'object')) hasObject = true;
    if (u.object.length && verbs.length && u.object.some((o) => o.role === 'object')) ctx.rule('order');
    const end = signs.length - 1;
    if (isCond && end >= start) marks.push({ kind: 'cond', from: start, to: end, label: 'eyebrows up' });
    if (rhetorical) { const at = signs.indexOf(rhetorical); marks.push({ kind: 'rhet', from: at, to: at, label: 'eyebrows up' }); }
    const negFrom = signs.findIndex((s, i) => i >= start && (s.role === 'neg' || s.role === 'describe' || verbs.includes(s)));
    if ((negSigns.length || verbs.some((s) => s.role === 'neg')) && negFrom >= 0) {
      const negTo = Math.max(...signs.map((s, i) => (i >= start && i <= end && (s.role === 'neg') ? i : -1)), negFrom);
      marks.push({ kind: 'neg', from: negFrom, to: negTo, label: 'head shake' });
    }
  }
  // questions
  const hasWh = signs.some((s) => s.role === 'question' && s.rule !== 'because');
  let kind = 'statement';
  if (question && hasWh) {
    kind = 'wh';
    marks.push({ kind: 'wh', from: timeStart, to: signs.length - 1, label: 'eyebrows furrowed' });
  } else if (question) {
    kind = 'yn';
    ctx.rule('yn');
    marks.push({ kind: 'yn', from: timeStart, to: signs.length - 1, label: 'eyebrows up, lean forward' });
  } else if (toks.some((t) => t.lets || t.imperative) || built.some((b) => b.units.verb.some((v) => toks.find((t) => t.wi === v.words[0])?.form === 'imperative'))) {
    kind = 'command';
  }
  if (signs.some((s) => s.state === 'missing')) ctx.rule('missing');
  if (signs.some((s) => s.rule === 'kept')) ctx.rule('kept');

  // English words: what happened to each
  const out = words.map((w, i) => {
    const f = fate[i];
    if (w.punct) return { text: w.text, start: w.start, end: w.end, punct: true };
    if (f?.sign) return { text: w.text, start: w.start, end: w.end, sign: signs.indexOf(f.sign) };
    return { text: w.text, start: w.start, end: w.end, drop: f?.drop || 'kept' };
  });
  for (const w of out) if (w.drop && !rules.includes(w.drop) && RULES[w.drop]) rules.push(w.drop);
  // a "not signed" rule only stays if some word is still unsigned because of it
  for (const id of ['aux', 'be', 'articles', 'to', 'dummy']) {
    if (rules.includes(id) && !out.some((w) => w.drop === id)) rules.splice(rules.indexOf(id), 1);
  }
  const words2 = out.map((w) => (w.sign === -1 ? { ...w, sign: undefined, drop: 'kept' } : w));
  const coverageReasons = [];
  if (built.some((b) => b.rough)) coverageReasons.push('This construction is outside the simple sentence rules.');
  if (words.filter((w) => !w.punct).length > 16) coverageReasons.push('This sentence is too complex for a reliable automatic order.');
  if (words2.some((w) => w.drop === 'kept') || signs.some((s) => s.rule === 'kept')) coverageReasons.push('Some English words could not be mapped to a supported rule.');
  const rough = coverageReasons.length > 0;
  const alt = hasObject ? altSigns.map((s) => signs.indexOf(s)).filter((i) => i >= 0) : null;
  return {
    text, kind, signs, words: words2, marks,
    rules: rules.filter((r) => RULES[r]),
    alt: alt && alt.join() !== signs.map((_, i) => i).join() ? alt : null,
    rough,
    coverage: { status: rough ? 'unsupported' : 'draft', reasons: coverageReasons },
    tense: tense || state.tense || null,
    timeSet: !!(allTime.length || added),
  };
}

/** Every sentence of a paragraph, in order, with time carried forward. */
export function buildParagraph(text, lex) {
  const state = {};
  return splitSentences(text).map((s) => {
    const out = buildSentence(s.text, lex, state);
    if (out.timeSet) state.tense = out.tense;
    return { ...out, start: s.start, end: s.end };
  });
}

/** The signs as a plain line: "YESTERDAY SHOP ME GO". */
export function glossLine(sentence) {
  return sentence.signs.map((s) => (s.spell ? s.spell.split(' ').map((w) => w.split('').join('-')).join(' ') : s.gloss)).join(' ');
}
