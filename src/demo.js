// Sample states for design review and screenshots, with no camera and no sign
// models:
//
//   ?demo=quiz-yes | quiz-close | quiz-no     a stamped verdict (Compare offered)
//   ?demo=compare                             your try beside Real SASL, on the desk
//   ?demo=guess | guess-compare               What did I sign?, and its Compare
//   ?demo=phrase
//   ?demo=understand
//   ?demo=spell | spell-wrong                 Spell a word: the next letter's drawing,
//                                             the letter being read lit on the plate
//   ?demo=letter                              Plate I, one hand enlarged with its tip
//   ?demo=dict | dict-watch                   the card drawer; one sign watched
//   ?demo=about
//
// app.js imports this only when the URL asks for it. Everything goes through
// the same render functions the camera path uses, fed made-up rankings and a
// made-up "try" (a reference clip, retimed and nudged, in camera pixels), so
// the page shows exactly what a learner would see. A demo never saves
// anything: the learner's lesson, tallies and settings are left as they were.

import { loadReplay } from './replay-data.js';
import { DISPLAY_FPS } from './watch.js';

const TARGET = 'THANK YOU';
const STILL = 0.45;

export async function runDemo(name, api) {
  const { state, el } = api;
  state.demo = true;                    // app.js: no saving while a demo runs
  const saved = readSaved();
  const labels = state.reference.labels;
  const known = new Set(labels);
  const greetings = state.lessons.find((l) => l.topic === 'Greetings and manners') ?? state.lessons[0];

  /** A whole-dictionary ranking that starts with `lead`, scored for the bars. */
  const ranking = (lead) => {
    const first = lead.filter((l) => known.has(l));
    const seen = new Set(first);
    return [...first, ...labels.filter((l) => !seen.has(l))]
      .map((label, i) => ({ label, rank: i, score: i < first.length ? [8.6, 6.4, 5.1, 4.2][i] ?? 3 : 2 / (1 + i / 50) }));
  };
  const top = (words) => words.filter((w) => known.has(w)).map((label) => ({ label }));

  /** A learner's try, made from a reference clip: slower, hands a little lower, in pixels. */
  const sampleTry = async (label, mode) => {
    const replay = await loadReplay();
    await replay.ready(label);
    const frames = replay.clipFrames(label);
    if (!frames) return null;
    return {
      clip: { frames: asTry(frames), fps: DISPLAY_FPS },
      mode, word: mode === 'quiz' ? TARGET : null, n: null, kind: null, choices: null,
    };
  };

  const inLesson = () => {
    api.setTab('signs');
    api.pickLesson(greetings.id);
    api.setBadge('Sample - no camera');
    // Earlier sessions' tallies, in memory only.
    state.progress = new Map([['HELLO', 4], ['PLEASE', 2], ['GOOD MORNING', 1], ['SORRY', 7]]
      .filter(([w]) => known.has(w)));
    api.renderLessonChips();
  };

  const quiz = async (kind) => {
    inLesson();
    api.setSignMode('quiz');
    state.quiz.word = TARGET;
    api.renderQuiz();
    // Two earlier tries, so the log on the lines has something above today's.
    state.quiz.tried = 2;
    state.quiz.right = 1;
    state.quiz.log = [{ n: 1, word: 'HELLO', kind: 'yes' }, { n: 2, word: 'PLEASE', kind: 'close' }];
    state.lastAttempt = await sampleTry(kind === 'no' ? 'EXCUSE ME' : TARGET, 'quiz');
    const lead = {
      yes: [TARGET, 'PLEASE', 'SORRY'],
      close: ['PLEASE', TARGET, 'SORRY'],
      no: ['EXCUSE ME', 'PLEASE', 'HELLO'],
    }[kind];
    api.showQuizVerdict(ranking(lead));
  };

  const guess = async () => {
    inLesson();
    api.setSignMode('guess');
    state.lastAttempt = await sampleTry(TARGET, 'guess');
    // a stand-in embedding, so "That's it" shows; a demo never keeps it
    const unitVec = () => new Float32Array(768).fill(1 / Math.sqrt(768));
    api.showGuess(Object.assign(ranking([TARGET, 'PLEASE', 'SORRY']), { embedding: { openhands: unitVec(), signclip: unitVec() } }));
  };

  const spell = (reading) => {
    api.setTab('spell');
    api.setSpellMode('word');
    api.newSpellWord('SAWUBONA');
    state.spell.index = 3;            // S, A and W held; U is next
    api.renderSpellWord();
    const alts = { U: [['V', 0.07], ['R', 0.03]], V: [['U', 0.21], ['W', 0.04]] }[reading];
    api.showReading({ best: { letter: reading, p: reading === 'U' ? 0.86 : 0.71 }, alternatives: alts.map(([letter, p]) => ({ letter, p })) });
    if (reading !== 'U') {
      el.spellHint.textContent = 'That reads as V, not U. Index and middle finger up, together. Apart it is V; crossed, R.';
    }
    api.setBadge('Sample - no camera');
  };

  const demos = {
    quiz: (sub) => quiz(sub ?? 'yes'),
    compare: async () => {
      await quiz('close');
      await api.openViewer({ label: TARGET, attempt: state.lastAttempt, at: 0.5 });
    },
    guess: async (sub) => {
      await guess();
      const a = state.lastAttempt;
      if (sub === 'compare' && a) await api.openViewer({ label: a.choices[0], attempt: a, choices: a.choices, at: 0.5 });
    },
    phrase: () => {
      inLesson();
      api.setSignMode('phrase');
      api.showPhrase([
        top(['HELLO', 'BYE BYE', 'OKAY (OK)']),
        top([TARGET, 'PLEASE', 'SORRY']),
        top(['GOODBYE', 'BYE BYE', 'HELLO']),
      ]);
    },
    understand: () => {
      api.setSignMode('understand');
      const r = (...pairs) => pairs.map(([label, score]) => ({ label, score }));
      const read = (pieces) => { const d = api.decode(pieces); return { ...d, choice: d.signs.map((x) => x.label) }; };
      state.understand.entries = [
        read([r(['YESTERDAY', 6], ['TODAY', 4.9], ['TOMORROW', 4.5]), r(['ME', 5], ['YOU', 3.6]), r(['APPLE', 4.2], ['ORANGE', 4.0], ['BALL', 3.1]), r(['EAT', 5.5], ['DRINK', 4.1])]),
        read([r(['YOU', 5.2], ['ME', 4.1]), r(['LIVE', 3.3], ['LOVE', 3.1], ['LIKE', 2.6]), r(['WHERE', 5.0], ['WHAT', 4.4])]),
      ];
      api.renderTranscript();
      api.setStep('see');
    },
    spell: (sub) => spell(sub === 'wrong' ? 'V' : 'U'),
    letter: async () => {
      spell('U');
      await api.openLoupe('T');
    },
    about: () => api.setTab('about'),
    dict: async (sub) => {
      api.setTab('dict');
      el.dictInput.value = 'day';
      api.renderDictionary(el.dictInput.value);
      if (sub === 'watch') await api.openViewer({ label: 'MONDAY', at: STILL });
    },
  };

  const [kind, sub] = name.split('-');
  const run = demos[kind];
  if (!run) {
    console.warn(`Unknown demo "${name}". Try quiz-yes, quiz-close, quiz-no, compare, guess, guess-compare, `
      + 'phrase, understand, spell, spell-wrong, letter, dict, dict-watch or about.');
    return;
  }
  document.body.classList.add('demo');
  try {
    await run(sub);
  } finally {
    restoreSaved(saved);
  }
}

/**
 * Reference frames -> a plausible webcam try: camera pixels (640x480-ish
 * framing), 30% slower with an uneven pace, the hands carried a little lower,
 * and now and then a dropped hand, as a tracker drops them.
 */
function asTry(frames) {
  const T = frames.length;
  const n = Math.round(T * 1.3);
  const out = [];
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    const warped = (u + 0.12 * Math.sin(Math.PI * u) * (1 - u)) * (T - 1);
    const f = frames[Math.min(T - 1, Math.round(warped))];
    const o = new Float32Array(f.length);
    for (let i = 0; i < f.length; i += 3) {
      if (f[i] === 0 && f[i + 1] === 0 && f[i + 2] === 0) continue;
      const hand = i >= 161 * 3 || (i >= 15 * 3 && i < 23 * 3);   // hands, and the pose's wrists and fingers
      o[i] = 330 + f[i] * 150;
      o[i + 1] = 250 + (f[i + 1] + (hand ? 0.1 : 0)) * 150;
      o[i + 2] = f[i + 2] * 150;
    }
    if (k % 11 === 7) o.fill(0, 161 * 3, 182 * 3);
    out.push(o);
  }
  return out;
}

const KEYS = ['lesson', 'progress', 'watch'];

function readSaved() {
  try { return KEYS.map((k) => localStorage.getItem(k)); } catch { return null; }
}

function restoreSaved(values) {
  if (!values) return;
  try {
    KEYS.forEach((k, i) => {
      if (values[i] == null) localStorage.removeItem(k);
      else localStorage.setItem(k, values[i]);
    });
  } catch { /* storage unavailable: nothing was saved either */ }
}
