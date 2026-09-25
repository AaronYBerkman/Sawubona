// "Understand me": from the signs a recording looked like, a guess at what was meant.
//
// Two steps, both deliberately modest:
//
//   decode(pieces)   each recorded piece comes with its ranked guesses. Pick
//                    one per piece, preferring what the recogniser was surest
//                    of, nudged a little by SASL order (time signs open a
//                    sentence, question words close it, a sign is rarely made
//                    twice in a row). The nudge is small: it can break a near
//                    tie, never overrule a clear reading.
//   toEnglish(gloss) the reverse of src/grammar.js: SASL order back into an
//                    English sentence (time first, question word to the front,
//                    subject-verb-object, tense from the time sign, adjectives
//                    before their noun). Anything it had to assume, such as a
//                    dropped "I", is listed so the page can say so.
//
// Neither reads the face or the signing space, so a yes/no question looks
// like a statement, and pointing is read as a plain pronoun.

import * as W from './grammar-words.js';

const lower = (g) => g.toLowerCase();
const bare = (label) => label.toUpperCase().replace(/\s*\(.*$/, '').replace(/\s+/g, ' ').trim();

const TIME_UP = new Set([
  ...Object.values(W.TIME_WORDS), ...W.DAYS.map((d) => d.toUpperCase()), ...W.MONTHS.map((m) => m.toUpperCase()),
  ...[...W.TIME_NOUNS].map((t) => t.toUpperCase()), 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'WEEKEND', 'ALL DAY', 'ALL NIGHT',
]);
const PAST_T = ['YESTERDAY', 'PAST', 'BEFORE', 'AGO', 'LAST', 'FINISH', 'ALREADY', 'RECENTLY'];
const FUTURE_T = ['TOMORROW', 'FUTURE', 'NEXT', 'LATER', 'SOON', 'TONIGHT'];
const WH_UP = new Set(['WHAT', 'WHERE', 'WHO', 'WHEN', 'WHY', 'HOW', 'WHICH', 'WHOSE', 'HOW MANY', 'HOW MUCH', 'HOW OLD', 'WHAT TIME']);
const NEG_UP = new Set(['NOT', 'NEVER', 'NO', 'NOT YET', "CAN'T", 'NOTHING', 'NOBODY']);
const PRON = { ME: 'I', I: 'I', YOU: 'you', HE: 'he', SHE: 'she', IT: 'it', WE: 'we', THEY: 'they' };
const OBJ = { I: 'me', you: 'you', he: 'him', she: 'her', it: 'it', we: 'us', they: 'them' };
const POSS = { MY: 'my', YOUR: 'your', HIS: 'his', HER: 'her', OUR: 'our', THEIR: 'their' };
const GREET = new Set(['NO', 'HELLO', 'HI', 'BYE', 'BYE BYE', 'GOODBYE', 'PLEASE', 'THANK YOU', 'SORRY', 'YES', 'OK', 'OKAY', 'WELCOME',
  'GOOD MORNING', 'GOOD NIGHT', 'GOOD AFTERNOON', 'GOOD EVENING', 'EXCUSE ME']);
const MASS = new Set('language english money water food milk bread meat coffee tea rice sugar juice information work homework music time fish chicken salt butter cheese soup weather news advice furniture luggage hair paper'.split(' '));
const NO_ARTICLE = new Set('school work church bed class university college prison court town home'.split(' '));
const COLOURS = new Set('red blue green yellow black white brown grey gray pink purple orange gold silver'.split(' '));
const CHAIN = new Set('want need like love hate try start begin stop finish learn'.split(' '));
const MOTION = new Set(['go', 'come', 'walk', 'run', 'drive', 'ride', 'fly', 'travel', 'move', 'return', 'arrive', 'visit']);
// where you are rather than where you go: LIVE DURBAN is "live in Durban"
const STAYING = new Set(['live', 'stay', 'work', 'study', 'born', 'grow up']);
// named places: no article, capital letters, "in" rather than "at"
const PROPER_PLACES = new Set(['DURBAN', 'JOHANNESBURG', 'JOBURG', 'CAPE TOWN', 'PRETORIA', 'SOWETO', 'BLOEMFONTEIN', 'EAST LONDON',
  'PORT ELIZABETH', 'GQEBERHA', 'POLOKWANE', 'KIMBERLEY', 'PIETERMARITZBURG', 'NELSPRUIT', 'MBOMBELA', 'SOUTH AFRICA', 'AFRICA',
  'GAUTENG', 'KWAZULU NATAL', 'LIMPOPO', 'MPUMALANGA', 'FREE STATE', 'NORTH WEST', 'WESTERN CAPE', 'EASTERN CAPE', 'NORTHERN CAPE',
  'ENGLAND', 'LONDON', 'AMERICA', 'ZIMBABWE', 'LESOTHO', 'NAMIBIA', 'MOZAMBIQUE', 'BOTSWANA', 'ZAMBIA', 'KENYA', 'CHINA', 'JAPAN',
  'BRAZIL', 'NEW ZEALAND', 'EUROPE']);
// a title joins the fingerspelled name after it: DOCTOR N-A-I-D-O-O is "Doctor Naidoo"
const TITLES = new Set(['DOCTOR', 'MR', 'MRS', 'MS', 'MISS', 'PROFESSOR']);
// a word fingerspelled letter by letter (T-H-A-B-O) is a name
const spelledName = (label) => {
  const g = bare(label);
  return /^[A-Z](-[A-Z])+$/.test(g) ? capName(g.replace(/-/g, '')) : null;
};
const PAST = {
  be: 'was', go: 'went', come: 'came', eat: 'ate', drink: 'drank', see: 'saw', buy: 'bought', bring: 'brought',
  think: 'thought', teach: 'taught', catch: 'caught', fight: 'fought', make: 'made', say: 'said', tell: 'told',
  sell: 'sold', take: 'took', give: 'gave', get: 'got', know: 'knew', grow: 'grew', throw: 'threw', fly: 'flew',
  draw: 'drew', write: 'wrote', ride: 'rode', drive: 'drove', speak: 'spoke', break: 'broke', choose: 'chose',
  wake: 'woke', steal: 'stole', forget: 'forgot', begin: 'began', swim: 'swam', sing: 'sang', run: 'ran', sit: 'sat',
  stand: 'stood', understand: 'understood', lose: 'lost', leave: 'left', feel: 'felt', keep: 'kept', sleep: 'slept',
  meet: 'met', feed: 'fed', read: 'read', hear: 'heard', pay: 'paid', mean: 'meant', send: 'sent', spend: 'spent',
  build: 'built', find: 'found', hold: 'held', win: 'won', hide: 'hid', fall: 'fell', wear: 'wore', shake: 'shook',
  become: 'became', have: 'had', do: 'did', put: 'put', cut: 'cut', hit: 'hit', hurt: 'hurt', let: 'let', cost: 'cost',
  learn: 'learned', born: 'born', kiss: 'kissed', like: 'liked', love: 'loved', play: 'played', work: 'worked',
};

/** What part a sign plays, from its English label. */
export function kindOf(label) {
  if (spelledName(label)) return 'name';
  const g = bare(label).replace(/-/g, ' ');
  const w = lower(g);
  if (PROPER_PLACES.has(g)) return 'place';
  if (g === 'CAN' || g === 'MUST' || g === 'SHOULD' || g === 'MAY') return 'modal';
  if (g === 'THIS' || g === 'THAT') return 'dem';
  if (g === 'HERE' || g === 'THERE') return 'location';
  if (g === 'MANY' || g === 'FEW') return 'num';
  if (g === 'TIME' || g === 'BIRTHDAY') return 'noun';
  if (g === 'FROM') return 'relation';
  if (g === 'AND' || g === 'BUT' || g === 'OR') return 'link';
  if (WH_UP.has(g)) return 'wh';
  if (g === 'NO') return 'greet';
  if (NEG_UP.has(g) || /^DON'?T |^DOESN'?T |^CAN'?T/.test(g)) return 'neg';
  if (g in PRON) return 'pron';
  if (g in POSS) return 'poss';
  if (GREET.has(g)) return 'greet';
  if (TIME_UP.has(g) || /^(LAST|NEXT|THIS|EVERY) /.test(g)) return 'time';
  if (/^\d+$/.test(g) || typeof W.NUMBERS[w] === 'number') return 'num';
  if (W.VERBS.has(w) || W.VERBS.has(w.split(' ')[0]) && /^\S+ (UP|DOWN|OUT|OFF|AWAY|BACK|ON|IN|OVER)$/.test(g)) return 'verb';
  if (W.ADJECTIVES.has(w)) return 'adj';
  if (W.PLACES.has(w)) return 'place';
  return 'noun';
}

// --- choosing one reading per piece ---------------------------------------------

const TEMP = 0.6;       // how sharply a piece's scores turn into belief
const BEAM = 24;

function prior(kind, i, n, prevLabel, label) {
  let p = 0;
  if (kind === 'time') p += i === 0 ? 0.5 : -0.35;
  if (kind === 'wh') p += i === n - 1 ? 0.5 : -0.35;
  if (kind === 'neg') p += i === n - 1 || i === n - 2 ? 0.15 : -0.15;
  if (kind === 'greet') p += i === 0 || i === n - 1 ? 0.2 : -0.2;
  if (prevLabel && prevLabel === label) p -= 1.2;
  return p;
}

/**
 * pieces: one ranked list per recorded piece, best first ([{ label, score }]).
 * Returns { signs: [{ label, kind, confidence, alts: [{ label, p }] }], clear }
 * where confidence is the belief in the chosen reading (0..1) and `clear`
 * counts pieces read with confidence above one half.
 */
export function decode(pieces, { top = 5 } = {}) {
  const cands = pieces.map((ranked) => {
    const list = ranked.slice(0, top);
    const s0 = list[0]?.score ?? 0;
    const w = list.map((r) => Math.exp((r.score - s0) / TEMP));
    const z = w.reduce((a, b) => a + b, 0) || 1;
    return list.map((r, k) => ({ label: r.label, p: w[k] / z, kind: kindOf(r.label) }));
  });
  const n = cands.length;
  let beams = [{ score: 0, path: [] }];
  for (let i = 0; i < n; i++) {
    const next = [];
    for (const b of beams) {
      const prev = b.path.length ? cands[i - 1][b.path[b.path.length - 1]].label : null;
      cands[i].forEach((c, k) => {
        next.push({ score: b.score + Math.log(c.p + 1e-9) + prior(c.kind, i, n, prev, c.label), path: [...b.path, k] });
      });
    }
    next.sort((a, b) => b.score - a.score);
    beams = next.slice(0, BEAM);
  }
  const best = beams[0]?.path ?? [];
  const signs = best.map((k, i) => ({
    label: cands[i][k].label,
    kind: cands[i][k].kind,
    confidence: cands[i][k].p,
    alts: cands[i].map((c) => ({ label: c.label, p: c.p })),
  }));
  // one sign split in two by a pause reads as the same label twice: keep one
  const merged = signs.filter((s, i) => i === 0 || s.label !== signs[i - 1].label);
  return { signs: merged, clear: merged.filter((s) => s.confidence > 0.5).length };
}

// --- back into English ------------------------------------------------------------

function capName(word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }

function article(word) { return /^[aeiou]/i.test(word) ? 'an' : 'a'; }

function plural(w) {
  if (/(s|x|z|ch|sh)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

function pastOf(v) {
  if (PAST[v]) return PAST[v];
  if (/e$/.test(v)) return `${v}d`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ied`;
  if (/^[^aeiou]*[aeiou][bdgkmnprt]$/.test(v) && v.length <= 4) return `${v}${v.slice(-1)}ed`;
  return `${v}ed`;
}

function thirdPerson(v) {
  if (v === 'have') return 'has';
  if (v === 'be') return 'is';
  if (/(s|x|z|ch|sh|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * glosses: sign labels in signed order. Returns { english, assumed: [..], question }.
 */
export function toEnglish(glosses) {
  const signs = glosses.map((g) => ({ g: spelledName(g) ?? bare(g).replace(/-/g, ' '), kind: kindOf(g), src: [g] }));
  const complementAt = signs.findIndex((s, i) => ['THINK', 'KNOW', 'BELIEVE', 'HOPE', 'REMEMBER'].includes(s.g) && signs[i + 1]?.kind === 'pron');
  if (complementAt >= 0) {
    const left = toEnglish(glosses.slice(0, complementAt + 1));
    const right = toEnglish(glosses.slice(complementAt + 1));
    return { english: left.english.replace(/[.!?]$/, '') + ' ' + right.english.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/^i\b/, 'I'),
      assumed: [...left.assumed, ...right.assumed], question: left.question || right.question };
  }
  if (signs.length === 1 && signs[0].g === 'WHAT TIME') return { english: 'What time is it?', assumed: [], question: true };
  // Restore independent clauses independently so times and subjects do not leak.
  const boundary = signs.findIndex((s, i) => s.kind === 'link' && i > 0
    && signs.slice(0, i).some((x) => x.kind === 'verb' || x.kind === 'adj')
    && signs.slice(i + 1).some((x) => x.kind === 'pron' || x.kind === 'verb'));
  if (boundary > 0) {
    const left = toEnglish(glosses.slice(0, boundary));
    let rightGloss = glosses.slice(boundary + 1);
    if (!rightGloss.some((g) => kindOf(g) === 'time')) {
      const inherited = signs.slice(0, boundary).filter((x) => x.kind === 'time').map((x) => x.g);
      if (inherited.includes('PAST') || inherited.includes('FUTURE')) rightGloss = [...inherited, ...rightGloss];
    }
    let right = toEnglish(rightGloss);
    // SHOP ME GO AND BREAD BUY: the second action has the same subject, so English says it once
    let shared = false;
    if (right.subjectAssumed && !left.question && !right.question) {
      if (left.subjectGlosses?.length) {
        const t = rightGloss.findIndex((g) => kindOf(g) !== 'time');
        const at = t < 0 ? rightGloss.length : t;
        right = toEnglish([...rightGloss.slice(0, at), ...left.subjectGlosses, ...rightGloss.slice(at)]);
      }
      shared = true;
    }
    let rhs = right.english.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/^i\b/, 'I');
    if (shared && right.subjectText && rhs.startsWith(`${right.subjectText} `)) rhs = rhs.slice(right.subjectText.length + 1);
    else shared = false;
    return { english: left.english.replace(/[.!?]$/, '') + ' ' + lower(signs[boundary].g) + ' ' + rhs,
      assumed: [...left.assumed, ...(shared ? [] : right.assumed)], question: left.question || right.question,
      subjectText: left.subjectText, subjectGlosses: left.subjectGlosses, subjectAssumed: left.subjectAssumed };
  }
  for (let i = signs.length - 2; i >= 0; i--) {
    if (TITLES.has(signs[i].g) && signs[i + 1].kind === 'name') {
      signs.splice(i, 2, { g: `${capName(signs[i].g)} ${signs[i + 1].g}`, kind: 'name', src: [...signs[i].src, ...signs[i + 1].src] });
    }
  }
  // MY MOTHER AND FATHER, T-H-A-B-O AND L-E-R-A-T-O: two people or things joined into one subject or object
  const THING = ['noun', 'name', 'place'];
  signs.forEach((s, i) => {
    if (s.g === 'AND' && i > 0 && THING.includes(signs[i - 1].kind) && THING.includes(signs[i + 1]?.kind)) signs[i + 1].joinPrev = true;
  });
  // SASL puts the action last: only the final run of verbs is the action, and a
  // verb-looking sign before it (SHOP ME GO, FISH DON'T LIKE) is a thing
  const negIdx = signs.findIndex((s) => s.kind === 'neg' && /^(DON'?T|DOESN'?T|CAN'?T) /.test(s.g));
  let lastVerb = negIdx >= 0 ? negIdx : signs.map((s) => s.kind).lastIndexOf('verb');
  let runStart = lastVerb;
  if (negIdx < 0) while (runStart > 0 && signs[runStart - 1].kind === 'verb' && CHAIN.has(lower(signs[runStart - 1].g))) runStart--;
  signs.forEach((s, i) => {
    if (s.kind === 'verb' && lastVerb >= 0 && i < runStart) s.kind = W.PLACES.has(lower(s.g)) ? 'place' : 'noun';
  });
  const assumed = [];
  signs.forEach((s, i) => { if (s.kind === 'verb' && signs[i - 1]?.kind === 'poss') s.kind = 'noun'; });
  const greet = signs.filter((s) => s.kind === 'greet').map((s) => cap(lower(s.g)));
  const rest = signs.filter((s) => s.kind !== 'greet');
  const times = rest.filter((s) => s.kind === 'time').map((s) => s.g);
  const wh = rest.find((s) => s.kind === 'wh');
  const neg = rest.find((s) => s.kind === 'neg');
  const modal = rest.find((s) => s.kind === 'modal');
  const relation = rest.filter((s) => ['relation', 'location'].includes(s.kind)).map((s) => lower(s.g)).join(' ');
  const core = rest.filter((s) => !['time', 'wh', 'neg', 'modal', 'relation', 'location', 'link'].includes(s.kind));
  let tense = 'present';
  if (times.some((t) => PAST_T.some((p) => t.includes(p)))) tense = 'past';
  else if (times.some((t) => FUTURE_T.some((p) => t.includes(p)))) tense = 'future';

  // verbs: the first verb is the action; a second one follows with "to" (WANT EAT: want to eat)
  let verbs = core.filter((s) => s.kind === 'verb').map((s) => lower(s.g));
  if (neg && /^(DON'?T|DOESN'?T|CAN'?T) /.test(neg.g)) verbs = [lower(neg.g.replace(/^\S+ /, '')), ...verbs];
  const nounish = [];
  let pending = null;
  let pendingSrc = [];
  for (const s of core) {
    if (s.kind === 'verb') continue;
    if (s.kind === 'poss') { pending = POSS[s.g]; pendingSrc = s.src; continue; }
    if (s.joinPrev && nounish.length) {
      (nounish[nounish.length - 1].with ??= []).push({ ...s, poss: pending, src: [...(pending ? pendingSrc : []), ...s.src] });
      pending = null;
      continue;
    }
    if (s.kind === 'adj' || s.kind === 'num') {
      const last = nounish[nounish.length - 1];
      if (last && !last.adjs && !['pron', 'dem'].includes(last.kind) && !(verbs.length && ['feel', 'look', 'seem', 'become', 'smell', 'taste', 'sound'].includes(verbs[0]))) { (last.mods ??= []).push(s); continue; }
      // with an action and nothing to describe, a word like ORANGE is the thing itself
      nounish.push(verbs.length && s.kind === 'adj' && !['feel', 'look', 'seem', 'become', 'smell', 'taste', 'sound'].includes(verbs[0]) ? { ...s, kind: 'noun', poss: pending } : { ...s, predicate: true });
      if (verbs.length) pending = null;
      continue;
    }
    nounish.push({ ...s, poss: pending, src: [...(pending ? pendingSrc : []), ...s.src] });
    pending = null;
  }
  const properName = (g) => g.split(' ').map(capName).join(' ');
  const phrase = (n, role) => {
    const one = single(n, role);
    if (!n.with) return one;
    // "my mother and father": the second shares the first's possessive
    return [one, ...n.with.map((m) => (n.poss && !m.poss && m.kind === 'noun' ? lower(m.g) : single(m, role)))].join(' and ');
  };
  const single = (n, role) => {
    if (n.kind === 'name') return n.g;
    if (n.kind === 'place' && PROPER_PLACES.has(n.g)) return properName(n.g);
    if (n.kind === 'dem') return lower(n.g);
    if (role === 'object' && nounish.some((x) => x.g === 'NAME')) return n.g.split(' ').map(capName).join(' ');
    if (n.kind === 'pron') return role === 'object' ? OBJ[PRON[n.g]] : PRON[n.g];
    const adjs = (n.mods ?? []).filter((m) => m.kind === 'adj').map((m) => lower(m.g))
      .sort((a, b) => (COLOURS.has(a) ? 1 : 0) - (COLOURS.has(b) ? 1 : 0));
    const num = (n.mods ?? []).find((m) => m.kind === 'num');
    let word = lower(n.g);
    if (num && lower(num.g) !== 'one') word = plural(word);
    const head = [...adjs, word].join(' ');
    if (n.poss) return `${n.poss} ${num ? `${lower(num.g)} ` : ''}${head}`;
    if (num) return `${lower(num.g)} ${head}`;
    if (n.g === 'NAME' && n.poss) return `${n.poss} name`;
    if (n.kind === 'place' && role === 'place') return NO_ARTICLE.has(word) ? word : `the ${head}`;
    if (role === 'subject') return `the ${head}`;
    if (MASS.has(word) || MASS.has(word.split(' ').pop()) || COLOURS.has(word) || word !== lower(n.g)) return head;
    return `${article(head)} ${head}`;
  };

  // subject: a pronoun if there is one, else the first person or thing
  let subjectIdx = nounish.findIndex((n) => n.kind === 'pron' || n.kind === 'dem');
  if (subjectIdx < 0) {
    const firstThing = nounish.findIndex((n) => (n.kind === 'noun' || n.kind === 'name' || n.kind === 'place' && (!verbs.length || wh?.g === 'WHEN')) && !n.predicate);
    if (firstThing >= 0 && (nounish.length > 1 || !verbs.length || nounish[firstThing].poss || wh?.g === 'WHEN')) subjectIdx = firstThing;
  }
  let subject;
  if (subjectIdx >= 0 && nounish[subjectIdx].kind === 'place' && verbs.some((v) => MOTION.has(v))) subjectIdx = -1;
  const subjectAssumed = subjectIdx < 0;
  if (subjectIdx >= 0) subject = phrase(nounish[subjectIdx], 'subject');
  else { subject = core.some((s) => ['RAIN', 'SNOW', 'HAIL', 'SUNNY', 'WINDY', 'CLOUDY'].includes(s.g)) ? 'it' : wh ? 'you' : 'I'; assumed.push(`"${subject}" (no one was named)`); }
  // with no verb, what follows the subject describes it: DOG BIG is "the dog is big"
  if (!verbs.length && subjectIdx >= 0 && nounish[subjectIdx].mods?.length && nounish.length === 1) {
    nounish.push(...nounish[subjectIdx].mods.map((m) => ({ ...m, predicate: true })));
    delete nounish[subjectIdx].mods;
    subject = phrase(nounish[subjectIdx], 'subject');
  }
  const moving = verbs.some((v) => MOTION.has(v));
  // a place is where you go, or where it happens; for other verbs it is just a thing (I have a house)
  const staying = verbs.some((v) => STAYING.has(v));
  for (const n of nounish) if (n.kind === 'place' && verbs.length && !moving && lower(n.g) !== 'home' && !(staying && PROPER_PLACES.has(n.g))) n.kind = 'noun';
  const others = nounish.filter((_, i) => i !== subjectIdx);
  const places = others.filter((n) => n.kind === 'place');
  const objects = others.filter((n) => n.kind !== 'place' && !n.predicate);
  const predicates = others.filter((n) => n.predicate);
  const subjectN = subjectIdx >= 0 ? nounish[subjectIdx] : null;
  const pluralSubject = !!subjectN?.with;
  const third = !pluralSubject && !['I', 'you', 'we', 'they'].includes(subject)
    && (subject === 'this' || subjectN?.kind === 'name' || !/s$/.test(subject.split(' ').pop()));
  const be = tense === 'past' ? (subject === 'I' || third ? 'was' : 'were')
    : tense === 'future' ? 'will be' : subject === 'I' ? 'am' : third ? 'is' : 'are';

  let clause;
  const placeText = places.map((p) => {
    const t = phrase(p, 'place');
    return moving ? (t === 'home' ? 'home' : `to ${t}`) : (t === 'home' ? 'at home' : `${PROPER_PLACES.has(p.g) ? 'in' : 'at'} ${t}`);
  }).join(' ');
  const objText = objects.map((o) => phrase(o, 'object')).join(' and ');
  if (verbs.length) {
    const [v, ...more] = verbs;
    const chain = more.length ? ` to ${more.join(' to ')}` : '';
    let vp;
    if (neg) {
      const aux = tense === 'past' ? 'did not' : tense === 'future' ? 'will not' : third ? 'does not' : 'do not';
      vp = /^CAN'?T/.test(neg.g) ? `cannot ${v}` : neg.g === 'NEVER' ? `never ${tense === 'past' ? pastOf(v) : third ? thirdPerson(v) : v}` : `${aux} ${v}`;
    } else if (modal) vp = `${lower(modal.g)} ${v}`;
    else if (tense === 'past') vp = pastOf(v);
    else if (tense === 'future') vp = `will ${v}`;
    else vp = third ? thirdPerson(v) : v;
    clause = { subject, vp: `${vp}${chain}`, rest: [objText, ...predicates.map((p) => lower(p.g)), placeText, relation].filter(Boolean).join(' ') };
  } else {
    // two people are teachers, not "a teacher"
    const comp = [...predicates.map((p) => lower(p.g)), ...objects.map((o) => (pluralSubject && o.kind === 'noun' && !o.poss && !o.mods && !o.with
      ? plural(lower(o.g)) : phrase(o, 'object')))].join(' and ');
    const b = neg ? `${be.replace('will be', 'will not be')}${be === 'will be' ? '' : ' not'}` : be;
    clause = { subject, vp: b, rest: [comp, placeText, relation].filter(Boolean).join(' ') };
  }

  const timeText = times.map((t) => {
    const w = lower(t);
    if (W.DAYS.includes(w)) return `on ${cap(w)}`;
    if (['morning', 'afternoon', 'evening'].includes(w)) return `in the ${w}`;
    if (w === 'night') return 'at night';
    if (w === 'past') return null;
    if (w === 'future') return null;
    if (w === 'finish') return null;
    return w;
  }).filter(Boolean).join(', ');

  let english;
  let question = false;
  if (wh) {
    question = true;
    let q = lower(wh.g);
    if (['HOW MANY', 'WHICH'].includes(wh.g) && objects.length === 1) {
      q += ' ' + (wh.g === 'HOW MANY' ? plural(lower(objects[0].g)) : lower(objects[0].g));
      clause.rest = [placeText, relation].filter(Boolean).join(' ');
    }
    if (!verbs.length) {
      english = `${cap(q)} ${be.split(' ')[0] === 'will' ? 'will' : be} ${[clause.subject === 'I' && assumed.length ? '' : clause.subject, clause.rest].filter(Boolean).join(' ')}${be === 'will be' ? ' be' : ''}`;
    } else if (['who', 'what'].includes(q) && subjectIdx < 0) {
      const v = verbs[0];
      english = `${cap(q)} ${tense === 'past' ? pastOf(v) : tense === 'future' ? `will ${v}` : thirdPerson(v)} ${clause.rest}`.trim();
      assumed.length = 0;
    } else {
      const aux = tense === 'past' ? 'did' : tense === 'future' ? 'will' : third ? 'does' : 'do';
      english = `${cap(q)} ${neg ? ({ do: "don't", does: "doesn't", did: "didn't", will: "won't" }[aux]) : aux} ${clause.subject} ${verbs.join(' to ')} ${clause.rest}`;
    }
    english = `${english.replace(/\s+/g, ' ').trim()}${timeText ? ` ${timeText}` : ''}?`;
  } else {
    const body = `${clause.subject} ${clause.vp} ${clause.rest}`.replace(/\s+/g, ' ').trim();
    english = `${timeText ? `${cap(timeText)} ` : ''}${timeText ? body : cap(body)}.`;
  }
  english = english.replace(/\bi\b/g, 'I');
  const subjectGlosses = subjectN ? [...subjectN.src, ...(subjectN.with ?? []).flatMap((m) => ['AND', ...m.src])] : [];
  return { english: [...greet.map((g) => `${g}.`), core.length || wh || times.length ? english : ''].filter(Boolean).join(' '), assumed, question,
    subjectText: subject, subjectGlosses, subjectAssumed };
}
