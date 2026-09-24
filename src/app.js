// Sawubona: SASL practice in the browser.
//
// Three things a learner does, each built so it works for someone it has never
// seen - nothing here is calibrated to the person using it:
//
//   Signs           sign a word from a lesson; the app says whether that is
//                   what it saw (Quiz), or names what it saw (What did I sign?)
//   Fingerspelling  letters read live from one hand, and whole words spelled
//   Dictionary      every sign in the reference, linked to its video
//
// Any reference sign can be watched in the page as a drawn signer made from
// the clip's tracked points (src/watch.js, src/figure.js), and a quiz try can
// be compared with it side by side. The drawing is never the video: every
// view of it links the Real SASL clip it came from.
//
// The accuracy each of those can honestly claim is measured offline (README,
// "How well it works") and the wording on screen follows those numbers.
//
// The page is a field journal (index.html, src/styles.css, assets/art/): the
// markup this file writes uses the journal's classes - stamps for verdicts,
// index cards for the dictionary, the specimen plate for the alphabet.
// ?demo=<state> fills the page with sample content and no camera (src/demo.js).

import { createTrackers, startCamera, stopCamera, drawOverlay, createClock } from './vision.js';
import { bodyFrame, frameVector, hasHands } from './features.js';
import { findSegments } from './segment.js';
import { framePoints } from './keypoints.js';
import { holisticFrame } from './holistic.js';
import { loadEncoders, embedOpenHands, embedSignCLIP } from './encoder.js';
import { loadReference, rankSigns, realSaslUrl } from './reference.js';
import {
  loadLetterModel, letterFeatures, letterLogProbs, spellingHand, createLetterReader, letterNames,
} from './letters.js';
import { referenceClip, attemptClip, createStage } from './watch.js';
import { alignAttempt, planKey, planNote, recordingMs, signText } from './sentence-practice.js';
import { decode, toEnglish } from './interpret.js';
import { createMotionReader } from './motion-letters.js';

const MAX_SIGN_MS = 6000;
const MAX_PHRASE_MS = 15000;
const MIN_RECORD_MS = 600;
// A single sign ends when the hands come down: once they have been up for a
// moment, this long with no hand raised stops the recording by itself.
const HANDS_DOWN_MS = 700;
const RAISED_FOR_MS = 500;
const REST_BELOW = 1.3;   // shoulder widths below the shoulders counts as resting
// "Understand me" listens: it starts when a hand has been up this long, and a
// sentence ends when the hands have rested this long (longer than the pause
// between two signs).
const LISTEN_RAISED_MS = 250;
const SENTENCE_DOWN_MS = 1300;

// Quiz verdicts. A lesson-only ranking would pass a completely different sign
// about one time in ten on a ten-word lesson, simply by elimination, so the
// target must also rank well across the whole dictionary. Set from measured
// genuine and impostor attempts (tools/quiz-thresholds.py; README, "The quiz").
const PASS_DICT_RANK = 100;
const CLOSE_DICT_RANK = 400;

const LETTER_SURE = 0.5;       // below this, the readout says it is unsure
const LETTER_HOLD_MS = 550;    // a letter must be held this long to count
const DOUBLE_LETTER_MS = 900;  // held on past a commit, the same letter counts again

const ICONS = 'assets/art/icons.svg';
const icon = (name) => `<svg class="j-icon" aria-hidden="true"><use href="${ICONS}#${name}"/></svg>`;

const $ = (sel) => document.querySelector(sel);
const el = {
  video: $('#video'), overlay: $('#overlay'), badge: $('#badge'), framing: $('#framing'),
  startCamera: $('#start-camera'), startLabel: $('#start-camera .btn-label'), stopCamera: $('#stop-camera'),
  statSigns: $('#stat-signs'), statLessons: $('#stat-lessons'), statLetters: $('#stat-letters'),
  statState: $('#stat-state'),
  lessonSelect: $('#lesson-select'), lessonChips: $('#lesson-chips'), lessonInput: $('#lesson-input'),
  lessonClear: $('#lesson-clear'), lessonSuggestions: $('#lesson-suggestions'), lessonNote: $('#lesson-note'),
  lessonCleared: $('#lesson-cleared'), lessonUndo: $('#lesson-undo'),
  lessonLink: $('#lesson-link'), lessonSize: $('#lesson-size'), lessonTitle: $('#lesson-title'),
  quiz: $('#quiz'), quizWord: $('#quiz-word'), quizWatch: $('#quiz-watch'), quizNext: $('#quiz-next'),
  quizVerdict: $('#quiz-verdict'), quizScore: $('#quiz-score'), quizLog: $('#quiz-log'),
  guess: $('#guess'), guessList: $('#guess-list'), guessNote: $('#guess-note'), guessIntro: $('#guess-intro'),
  phrase: $('#phrase'), phraseList: $('#phrase-list'), phraseNote: $('#phrase-note'), phraseTarget: $('#phrase-target'),
  understand: $('#understand'), uListen: $('#u-listen'), uScope: $('#u-scope'), uNote: $('#u-note'),
  uTranscript: $('#u-transcript'), uEmpty: $('#u-empty'),
  record: $('#record'), recordLabel: $('#record .btn-label'),
  camWord: $('#cam-word'), camWordText: $('#cam-word-text'),
  spellTarget: $('#spell-target'), spellWord: $('#spell-word'), spellHint: $('#spell-hint'),
  spellNext: $('#spell-next'), spellCustom: $('#spell-custom'), spellFree: $('#spell-free'),
  spellLetter: $('#spell-letter'), spellConfidence: $('#spell-confidence'), spellAlts: $('#spell-alts'),
  spellBuffer: $('#spell-buffer'), spellClear: $('#spell-clear'), dialFill: $('#dial-fill'),
  spellGuide: $('#spell-guide'), spellGuideImg: $('#spell-guide-img'), spellGuideCap: $('#spell-guide-cap'),
  plateGrid: $('#plate-grid'),
  dictInput: $('#dict-input'), dictCount: $('#dict-count'), dictList: $('#dict-list'),
  themeToggle: $('#theme-toggle'),
  // The drawn signer: in the quiz, and on the desk (Watch / Compare)
  quizProgress: $('#quiz-progress'), quizPlate: $('#quiz-plate'), quizFigure: $('#quiz-figure'),
  quizFigureStatus: $('#quiz-figure-status'), quizPlayer: $('#quiz-player'),
  guessActions: $('#guess-actions'), guessCompare: $('#guess-compare'),
  viewer: $('#viewer'), viewerKind: $('#viewer-kind'), viewerTitle: $('#viewer-title'), viewerNote: $('#viewer-note'),
  viewerChoices: $('#viewer-choices'), viewerFigs: $('#viewer-figs'),
  viewerRef: $('#viewer-ref'), viewerRefStatus: $('#viewer-ref-status'), viewerRefCap: $('#viewer-ref-cap'),
  viewerRefNo: $('#viewer-ref-no'),
  viewerYouCard: $('#viewer-you-card'), viewerYou: $('#viewer-you'), viewerYouStatus: $('#viewer-you-status'),
  viewerYouCap: $('#viewer-you-cap'),
  viewerPlayer: $('#viewer-player'), viewerExplain: $('#viewer-explain'), viewerSrc: $('#viewer-src'),
  viewerLesson: $('#viewer-lesson'),
  // Plate I, one hand enlarged; the next letter's drawing in Spell a word
  loupe: $('#loupe'), loupeImg: $('#loupe-img'), loupeTitle: $('#loupe-title'), loupeNote: $('#loupe-note'),
  loupeTip: $('#loupe-tip'), loupeSrc: $('#loupe-src'), loupePrev: $('#loupe-prev'), loupeNext: $('#loupe-next'),
  loupeCount: $('#loupe-count'),
  spellCue: $('#spell-cue'), spellCueBtn: $('#spell-cue-btn'), spellCueImg: $('#spell-cue-img'),
  spellCueLetter: $('#spell-cue-letter'), spellCueNote: $('#spell-cue-note'), spellCueLabel: $('#spell-cue-label'),
  // Tallies of matched signs
  lessonProgress: $('#lesson-progress'), progressClear: $('#progress-clear'),
};

const state = {
  tab: 'signs',
  clock: createClock(),
  ctx: el.overlay.getContext('2d'),
  trackers: null,
  stream: null,
  lastFrame: null,
  reference: null,
  lessons: [],
  wordLesson: new Map(),   // sign -> the first lesson it appears in, for the dictionary cards
  lesson: { id: 'custom', words: [] },
  clearedLesson: null,     // the list before "Clear the list", until the lesson changes again
  signMode: 'quiz',
  quiz: { word: null, tried: 0, right: 0, misses: new Map(), log: [] },
  recording: null,
  busy: false,
  spell: {
    mode: 'word', reader: createLetterReader(), motion: createMotionReader(), candidate: null, since: 0, armed: true,
    committed: [], committedAt: [], target: '', index: 0, wrongSince: 0, shown: null, cue: null,
  },
  // The drawn signer. speed and mirror are the learner's, kept on this computer;
  // quiz and viewer are the stages (src/watch.js) currently on the page.
  watch: { ...loadWatchPrefs(), quiz: null, quizWord: null, quizToken: 0, viewer: null, viewerToken: 0, open: null },
  // The last sign recorded, kept in memory until the next one, for Compare.
  lastAttempt: null,
  // How many times each sign has been matched in the quiz, on this computer.
  progress: loadProgress(),
  // The sentence builder (src/sentence-view.js), mounted the first time its tab
  // opens; plan is the sentence being practised on the camera, if any, and
  // sentence the builder's sentence it came from (a try is shown against it).
  sentence: { view: null, mounting: null, plan: null, sentence: null, gloss: '' },
  // "Understand me": what was signed and read, newest first (kept in memory only)
  understand: { entries: [], raisedSince: null },
};

// --- Startup ---------------------------------------------------------------

async function boot() {
  setState('Loading');
  renderPlate();
  try {
    const [ref, lessons] = await Promise.all([
      loadReference(),
      fetch('data/lessons.json').then((r) => r.json()),
      loadLetterModel(),
    ]);
    state.reference = ref;
    state.lessons = lessons.lessons;
    for (const l of state.lessons) {
      for (const w of l.words) if (!state.wordLesson.has(w)) state.wordLesson.set(w, l);
    }
    el.statSigns.textContent = ref.labels.length.toLocaleString();
    el.statLessons.textContent = String(state.lessons.length);
    el.statLetters.textContent = String(letterNames().length);
    restoreLesson();
    renderLessonSelect();
    renderLesson();                 // and the dictionary, whose buttons follow the lesson
    newSpellWord();
    setState('Camera off');
  } catch (err) {
    setState('Could not load');
    el.framing.textContent = `The reference data did not load (${err.message}). `
      + 'Start the app with npm start from its folder, not by opening the file directly.';
    return;
  }
  const demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    import('./demo.js')
      .then((m) => m.runDemo(demo, demoApi))
      .catch((err) => console.error('demo failed', err));
  }
}

// --- Tabs --------------------------------------------------------------------

function setTab(name) {
  state.tab = name;
  for (const t of document.querySelectorAll('.tab')) {
    t.setAttribute('aria-selected', String(t.dataset.tab === name));
  }
  for (const panel of document.querySelectorAll('.panel')) {
    panel.hidden = panel.id !== `panel-${state.tab}`;
  }
  document.body.dataset.tab = state.tab;
  if (state.recording) stopRecording();
  state.watch.quiz?.pause();
  if (name === 'sentences') mountSentences();
  else state.sentence.view?.stop();
}

// --- Sentences -------------------------------------------------------------------

function mountSentences() {
  if (state.sentence.mounting) return state.sentence.mounting;
  state.sentence.mounting = (async () => {
    const [{ mountSentenceBuilder }, { loadReplay }, { createReplay }] = await Promise.all([
      import('./sentence-view.js'), import('./replay-data.js'), import('./figure.js'),
    ]);
    const ref = state.reference ?? await loadReference();
    state.sentence.view = mountSentenceBuilder($('#sentences'), {
      labels: ref.clips.map((c) => c.label),
      replay: { load: loadReplay, create: createReplay },
      onPractise: practiseSentence,
      heading: false,
    });
  })();
  state.sentence.mounting.catch((err) => {
    state.sentence.mounting = null;
    $('#sentences').textContent = `The sentence builder did not load (${err.message}).`;
  });
  return state.sentence.mounting;
}

/** "Sign it yourself": the camera page, in phrase mode, checking against this plan. */
function practiseSentence(plan, sentence) {
  // the builder's own signs say why one cannot be checked (a name spelt, a number)
  const signs = sentence?.signs?.length === plan.length ? sentence.signs : [];
  plan = plan.map((p, i) => ({
    gloss: p.gloss, entry: p.entry || null, kind: signs[i]?.state ?? p.kind ?? null, spell: signs[i]?.spell ?? p.spell ?? null,
  }));
  state.sentence.plan = plan;
  state.sentence.sentence = sentence ?? null;
  state.sentence.gloss = plan.map((p) => p.gloss).join(' → ');
  // a result still on screen was for another sentence
  el.phraseList.innerHTML = '';
  el.phraseNote.textContent = '';
  el.phraseTarget.hidden = false;
  el.phraseTarget.innerHTML = `
    <p class="j-caps">Your sentence</p>
    <p class="phrase-target-signs">${plan.map((p) => `<span${p.entry ? '' : ' class="unchecked"'}>${escapeHtml(signText(p))}</span>`).join('<span class="arrow" aria-hidden="true">→</span>')}</p>
    <p class="pencil small">"${escapeHtml(sentence?.text ?? '')}" · ${escapeHtml(planNote(plan, { labels: state.reference?.labels }))}</p>
    <p class="phrase-target-actions"><button type="button" class="link-btn" data-sentence="back">Back to Sentences</button>
      <button type="button" class="link-btn" data-sentence="clear">Sign any phrase instead</button></p>`;
  setTab('signs');
  setSignMode('phrase');
  el.framing.textContent = 'Sign the sentence with a short pause between signs, then put your hands down.';
}

function clearSentencePlan() {
  state.sentence.plan = null;
  state.sentence.sentence = null;
  el.phraseTarget.hidden = true;
  el.phraseTarget.innerHTML = '';
  el.phraseList.innerHTML = '';
  el.phraseNote.textContent = '';
}

el.phraseTarget.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sentence]');
  if (!b) return;
  if (b.dataset.sentence === 'back') setTab('sentences');
  else clearSentencePlan();
});

/** The planned signs, each stamped with what the camera saw (src/sentence-practice.js). */
function showSentenceAttempt(result) {
  const STAMP = { seen: ['match', 'seen'], close: ['close', 'close'], missed: ['not', 'not seen'] };
  el.phraseList.innerHTML = result.signs.map((r, i) => {
    const st = STAMP[r.status];
    return `<li class="phrase-planned"><span class="phrase-word">${escapeHtml(r.text ?? r.gloss)}</span>
      ${st ? `<span class="j-stamp j-stamp--${st[0]} j-stamp--in" style="--tilt:${(i % 3) - 4}deg">${st[1]}</span>` : `<span class="phrase-alts">${escapeHtml(r.note ?? 'not checked')}</span>`}
      ${r.status === 'close' && r.other ? `<span class="phrase-alts">looked more like ${escapeHtml(r.other)}</span>` : ''}</li>`;
  }).join('');
  el.phraseNote.textContent = result.summary + (result.checked
    ? ' Each piece of your recording was ranked against the whole dictionary, then lined up with your sentence in order.' : '');
  setStep('see');
  revealResult(el.phraseList.parentElement);
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
  // Arrow keys move along the tab row, as a tab list should.
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...document.querySelectorAll('.tab')];
    const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    setTab(next.dataset.tab);
  });
}
document.body.dataset.tab = state.tab;

/** Which of Watch / Sign / See how you did the learner is on; the page marks it. */
function setStep(step) {
  document.body.dataset.step = step;
}

// --- Camera and the per-frame loop ----------------------------------------

el.startCamera.addEventListener('click', async () => {
  el.startCamera.disabled = true;
  try {
    if (!state.trackers) state.trackers = await createTrackers((m) => setBadge(`${m}…`));
    setBadge('Starting camera…');
    state.stream = await startCamera(el.video);
    el.overlay.width = el.video.videoWidth;
    el.overlay.height = el.video.videoHeight;
    el.startCamera.hidden = true;
    el.stopCamera.hidden = false;
    document.body.classList.add('live');
    setState('Camera on', true);
    setBadge('Ready');
    requestAnimationFrame(loop);
    // The sign models are the big download; fetch them while the learner is
    // still getting into frame, not on the first attempt.
    loadEncoders((m) => setBadge(`${m}…`))
      .then(() => {
        setBadge('Ready');
        el.record.disabled = false;
        // ask the browser not to clear the cached models when space runs low
        navigator.storage?.persist?.().catch(() => {});
      })
      .catch((err) => { setBadge('Sign models failed to load'); el.framing.textContent = err.message; });
  } catch (err) {
    el.startCamera.disabled = false;
    setBadge('Camera unavailable');
    el.framing.textContent = `Could not start the camera: ${err.message}`;
  }
});

el.stopCamera.addEventListener('click', () => {
  if (state.recording) stopRecording();
  stopCamera(el.video, state.stream);
  state.stream = null;
  state.lastFrame = null;
  state.ctx.clearRect(0, 0, el.overlay.width, el.overlay.height);
  document.body.classList.remove('live');
  el.stopCamera.hidden = true;
  el.startCamera.hidden = false;
  el.startCamera.disabled = false;
  el.startLabel.textContent = 'Turn camera back on';
  el.record.disabled = true;
  setBadge('Camera off');
  setState('Camera off');
  el.framing.textContent = 'Camera released — the indicator light should be out.';
});

let lastTs = -1;
function loop() {
  const video = el.video;
  if (state.stream && video.readyState >= 2) {
    const ts = state.clock();
    if (ts > lastTs) {
      lastTs = ts;
      const handResult = state.trackers.hands.detectForVideo(video, ts);
      const poseResult = state.trackers.pose.detectForVideo(video, ts);
      const frame = bodyFrame(poseResult) ?? state.lastFrame;
      if (frame) state.lastFrame = frame;
      drawOverlay(state.ctx, el.overlay.width, el.overlay.height, handResult, Boolean(frame));

      const rec = state.recording;
      if (rec) {
        const faceResult = state.trackers.face.detectForVideo(video, ts);
        rec.times.push(ts);
        rec.vectors.push(frameVector(handResult, frame));
        rec.points.push(framePoints(handResult, poseResult));
        rec.holistic.push(holisticFrame(handResult, poseResult, faceResult,
          video.videoWidth, video.videoHeight));
        const practising = rec.mode === 'phrase' && state.sentence.plan;
        const limit = rec.mode === 'sign' ? MAX_SIGN_MS : practising ? recordingMs(state.sentence.plan) : MAX_PHRASE_MS;
        const left = Math.ceil((limit - (ts - rec.startedAt)) / 1000);
        setBadge(`Recording — ${left}s`);
        if (ts - rec.startedAt > limit) stopRecording();
        else if (rec.mode === 'sign' && handsDown(rec, handResult, frame, ts)) stopRecording();
        else if (rec.mode === 'understand' && handsDown(rec, handResult, frame, ts, SENTENCE_DOWN_MS)) stopRecording();
        else if (practising && handsDown(rec, handResult, frame, ts, SENTENCE_DOWN_MS)) stopRecording();
      } else if (state.tab === 'signs') {
        updateFraming(handResult, frame);
        if (state.signMode === 'understand' && el.uListen.checked && !state.busy) listen(handResult, frame, ts);
      }
      if (state.tab === 'spell') updateSpelling(handResult, ts);
    }
  }
  if (state.stream) requestAnimationFrame(loop);
}

/** "Understand me": start recording once a hand has come up and stayed up. */
function listen(handResult, frame, ts) {
  const raised = (handResult?.landmarks ?? []).some((h) =>
    frame && (h[0].y - frame.oy) / frame.scale < REST_BELOW);
  if (!raised) { state.understand.raisedSince = null; return; }
  state.understand.raisedSince ??= ts;
  if (ts - state.understand.raisedSince >= LISTEN_RAISED_MS) {
    state.understand.raisedSince = null;
    startRecording();
  }
}

/** True once a sign has been made and the hands have come back down. */
function handsDown(rec, handResult, frame, ts, downMs = HANDS_DOWN_MS) {
  const raised = (handResult?.landmarks ?? []).some((h) =>
    !frame || (h[0].y - frame.oy) / frame.scale < REST_BELOW);
  if (raised) {
    rec.raisedSince ??= ts;
    rec.loweredSince = null;
    return false;
  }
  if (rec.raisedSince == null || ts - rec.raisedSince < RAISED_FOR_MS) {
    rec.raisedSince = null;
    return false;
  }
  rec.loweredSince ??= ts;
  return ts - rec.loweredSince > downMs;
}

function updateFraming(handResult, frame) {
  const hands = handResult?.landmarks?.length ?? 0;
  let text;
  if (!frame) {
    text = 'Sit back until your head and shoulders are in view — every sign is measured against them.';
  } else if (!hands) {
    text = 'Ready. Hands down, then record and sign.';
  } else {
    text = hands === 1 ? 'One hand in view.' : 'Both hands in view.';
  }
  if (el.framing.textContent !== text) el.framing.textContent = text;
}

function setBadge(text) {
  el.badge.textContent = text;
}

function setState(text, live = false) {
  el.statState.textContent = text;
  el.statState.classList.toggle('live', live);
}

// --- Recording ---------------------------------------------------------------

function startRecording() {
  if (state.recording || state.busy || !state.stream || el.record.disabled) return;
  const mode = state.signMode === 'phrase' || state.signMode === 'understand' ? state.signMode : 'sign';
  state.recording = {
    mode, startedAt: performance.now(), times: [], vectors: [], points: [], holistic: [],
  };
  document.body.classList.add('recording');
  state.watch.quiz?.pause();
  el.recordLabel.textContent = 'Stop';
  setStep('sign');
  el.framing.textContent = mode === 'phrase'
    ? 'Sign the phrase, with a short pause between signs. Hands down when you are done.'
    : mode === 'understand' ? 'Watching. Pause briefly between signs, and rest your hands when you are done.'
      : 'Sign now, then drop your hands.';
}

function stopRecording() {
  const rec = state.recording;
  if (!rec) return;
  state.recording = null;
  document.body.classList.remove('recording');
  el.recordLabel.textContent = 'Record';
  setBadge('Ready');

  const duration = performance.now() - rec.startedAt;
  if (duration < MIN_RECORD_MS || rec.times.length < 8) {
    el.framing.textContent = 'That was too short — keep recording for the whole sign.';
    return;
  }
  if (!rec.vectors.some(hasHands)) {
    el.framing.textContent = 'No hands were visible in that recording. Try again with your hands in view.';
    return;
  }
  if (rec.mode === 'sign') {
    // Kept in memory (never stored) until the next try, so it can be compared.
    state.lastAttempt = {
      clip: attemptClip(rec.holistic, rec.times),
      mode: state.signMode,
      word: state.signMode === 'quiz' ? state.quiz.word : null,
      n: null, kind: null, choices: null,
    };
  }
  el.framing.textContent = 'Reading your sign…';
  state.busy = true;
  el.record.disabled = true;
  const done = () => {
    state.busy = false;
    el.record.disabled = !state.stream;
  };
  const work = rec.mode === 'phrase' ? readPhrase(rec) : rec.mode === 'understand' ? readUnderstand(rec) : readSign(rec);
  work.catch((err) => { el.framing.textContent = `Could not read that: ${err.message}`; }).finally(done);
}

el.record.addEventListener('click', () => {
  if (state.recording) stopRecording();
  else startRecording();
});

// Hold Space to record. Space keeps its usual job wherever the learner has
// gone with the keyboard: a button or link they tabbed to (it shows a focus
// ring) is pressed by Space as anywhere else, a text box types a space, and an
// open dialog keeps every key. On the page itself, on Record, or on a button
// last clicked with the mouse (no ring shows), Space records - and while
// Record cannot be used (camera off, a try being read) Space is left alone.
let pointerFocus = false;
let spaceHeld = false;     // this Space press is Record's, from keydown to keyup
document.addEventListener('pointerdown', () => { pointerFocus = true; }, true);
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && !MODIFIERS.has(e.key)) pointerFocus = false;   // Tab, arrows: keyboard again
}, true);

const TYPING = 'input:not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea, [contenteditable]';
const CONTROL = 'button, a[href], summary, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])';

function spaceIsTaken() {
  if (document.querySelector('dialog[open]')) return true;
  const a = document.activeElement;
  if (!a || a === document.body || a === el.record) return false;
  if (a.matches(TYPING)) return true;
  return Boolean(a.closest(CONTROL)) && !pointerFocus;
}

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || state.tab !== 'signs') return;
  if (e.repeat) {                      // held down: no page scrolling mid-sign
    if (spaceHeld) e.preventDefault();
    return;
  }
  if (spaceIsTaken() || (el.record.disabled && !state.recording)) return;
  e.preventDefault();
  spaceHeld = true;
  // A clicked button lets go of the focus, so no ring appears on it mid-sign.
  const a = document.activeElement;
  if (a && a !== document.body && a !== el.record) a.blur();
  startRecording();
});

document.addEventListener('keyup', (e) => {
  if (e.code !== 'Space' || !spaceHeld) return;
  spaceHeld = false;
  e.preventDefault();
  stopRecording();
});

/** Every sign in the dictionary ranked for one stretch of recording. */
async function rank(rec, start = 0, end = rec.times.length) {
  const times = rec.times.slice(start, end);
  const [openhands, signclip] = await Promise.all([
    embedOpenHands(rec.points.slice(start, end), times),
    embedSignCLIP(rec.holistic.slice(start, end), times),
  ]);
  return rankSigns({ openhands, signclip });
}

function lessonSet() {
  return new Set(state.lesson.words);
}

async function readSign(rec) {
  const ranked = await rank(rec);
  el.framing.textContent = 'Ready for another.';
  if (state.signMode === 'quiz') showQuizVerdict(ranked);
  else showGuess(ranked);
}

// --- Quiz ----------------------------------------------------------------------

const VERDICTS = {
  yes: { stamp: 'Matched', icon: 'check', cls: 'match', log: 'matched' },
  close: { stamp: 'Close', icon: 'approx', cls: 'close', log: 'close' },
  no: { stamp: 'Not yet', icon: 'close', cls: 'not', log: 'not yet' },
};

function pickQuizWord() {
  const words = state.lesson.words;
  if (!words.length) {
    state.quiz.word = null;
  } else {
    // Words missed before come up more often; never the same word twice running.
    const pool = words.length > 1 ? words.filter((w) => w !== state.quiz.word) : words;
    const weight = (w) => 1 + 2 * (state.quiz.misses.get(w) ?? 0);
    let r = Math.random() * pool.reduce((s, w) => s + weight(w), 0);
    state.quiz.word = pool.find((w) => (r -= weight(w)) <= 0) ?? pool[pool.length - 1];
  }
  renderQuiz();
}

function renderQuiz() {
  const word = state.quiz.word;
  el.quizWord.classList.toggle('empty', !word);
  el.quizWord.innerHTML = word ? glossHtml(word) : 'Add words to the lesson first';
  const url = word ? realSaslUrl(word) : null;
  el.quizWatch.hidden = !url;
  if (url) el.quizWatch.href = url;
  el.quizVerdict.hidden = true;
  el.quizVerdict.innerHTML = '';
  el.camWordText.textContent = word ? splitLabel(word).head : '';
  el.camWord.hidden = !word || state.signMode !== 'quiz';
  if (state.signMode === 'quiz') setStep('watch');
  renderQuizProgress();
  renderQuizFigure(word);
  renderQuizScore();
}

/** Under the word: how often it has been matched before, as pencil tallies. */
function renderQuizProgress() {
  const word = state.quiz.word;
  const n = word ? matchedCount(word) : 0;
  el.quizProgress.hidden = !word;
  el.quizProgress.innerHTML = n
    ? `${tallyHtml(n, false)}<span>Matched ${times(n)} so far</span>`
    : '<span>Not matched yet</span>';
}

function renderQuizScore() {
  const { tried, right, log } = state.quiz;
  const last = state.lastAttempt;
  el.quizLog.innerHTML = log.slice(-5).map((t) => `
    <li><span class="log-n">Try ${t.n}</span> <span class="log-word">${escapeHtml(t.word)}</span>
      <span class="log-kind k-${t.kind}">— ${VERDICTS[t.kind].log}</span>${last?.clip && last.n === t.n
        ? ` <button class="log-compare" type="button" data-compare aria-haspopup="dialog">compare<span class="visually-hidden"> try ${t.n} with Real SASL</span></button>`
        : ''}</li>`).join('');
  el.quizScore.textContent = tried
    ? `${right} of ${tried} matched this session.`
    : 'Your result is stamped here after you sign.';
}

el.quizNext.addEventListener('click', pickQuizWord);
el.quizLog.addEventListener('click', (e) => {
  if (e.target.closest('[data-compare]')) compareLastTry();
});

function showQuizVerdict(ranked) {
  const target = state.quiz.word;
  if (!target) return;
  const inLesson = lessonSet();
  const lessonRanked = ranked.filter((r) => inLesson.has(r.label));
  const place = lessonRanked.findIndex((r) => r.label === target);
  const dictRank = ranked.find((r) => r.label === target)?.rank ?? Infinity;

  let kind;
  if (place === 0 && dictRank < PASS_DICT_RANK) kind = 'yes';
  else if (place >= 0 && place <= 2 && dictRank < CLOSE_DICT_RANK) kind = 'close';
  else kind = 'no';

  state.quiz.tried += 1;
  if (kind === 'yes') {
    state.quiz.right += 1;
    recordMatch(target);
  } else {
    state.quiz.misses.set(target, (state.quiz.misses.get(target) ?? 0) + 1);
  }
  state.quiz.log.push({ n: state.quiz.tried, word: target, kind });
  const attempt = state.lastAttempt;
  if (attempt && attempt.word === target && attempt.n == null) Object.assign(attempt, { n: state.quiz.tried, kind });
  const canCompare = Boolean(attempt?.clip && attempt.n === state.quiz.tried);

  // What it looked like instead: the nearest lesson word if that was not the
  // target, otherwise the nearest sign anywhere (the attempt won the lesson only
  // by elimination).
  const name = (w) => `<strong>${escapeHtml(w)}</strong>`;
  const rival = place !== 0 ? lessonRanked[0]?.label : ranked.find((r) => r.label !== target)?.label;
  const text = kind === 'yes'
    ? `That matched ${name(target)}.`
    : kind === 'close' && place === 0
      ? `Nearly. ${name(target)} was the closest word in your lesson, but not a clear match — `
        + 'watch the reference and try it once more.'
      : kind === 'close'
        ? `Close. ${name(target)} was among the nearest, but it looked more like ${name(rival)}. `
          + 'Watch the reference and try again.'
        : `That looked more like ${name(rival)} than ${name(target)}. Watch the reference and try again.`;
  const v = VERDICTS[kind];
  const tilt = { yes: -6, close: 3, no: -3 }[kind];
  el.quizVerdict.className = `verdict ${kind}`;
  el.quizVerdict.innerHTML = `
    <span class="j-stamp j-stamp--${v.cls} j-stamp--in" style="--tilt:${tilt}deg">${v.stamp} ${icon(v.icon)}</span>
    <p class="verdict-text">${text}</p>
    <p class="verdict-actions">
      ${kind === 'yes'
        ? `<button class="j-btn small-btn" id="quiz-continue" type="button">Next word ${icon('arrow')}</button>`
        : ''}
      ${canCompare
        ? `<button class="j-btn j-btn--quiet small-btn" id="quiz-compare" type="button" aria-haspopup="dialog">${icon('eye')}Compare with Real SASL</button>`
        : ''}
    </p>`;
  el.quizVerdict.hidden = false;
  $('#quiz-continue')?.addEventListener('click', pickQuizWord);
  $('#quiz-compare')?.addEventListener('click', compareLastTry);
  setStep('see');
  renderQuizScore();
  revealResult(el.quizVerdict);
}

/**
 * Bring a new result on screen - on a laptop the stamp lands below the fold.
 * The camera stays in view beside it (or above it, on a phone): it is sticky.
 */
function revealResult(node) {
  // A ?demo= page is for screenshots, and headless Chrome captures a scrolled
  // page badly: demos leave the scroll alone.
  if (!node || node.hidden || state.demo) return;
  node.scrollIntoView({ block: 'nearest', behavior: reduceMotion?.matches ? 'auto' : 'smooth' });
}

// --- What did I sign? -------------------------------------------------------

function showGuess(ranked) {
  const inLesson = lessonSet();
  const pool = inLesson.size ? ranked.filter((r) => inLesson.has(r.label)) : ranked;
  const top = pool.slice(0, 3);
  const best = top[0]?.score ?? 1;
  el.guessList.innerHTML = top.map((m, i) => {
    const url = realSaslUrl(m.label);
    return `
    <li class="${i === 0 ? 'best' : ''}">
      <span class="cand-label">${escapeHtml(m.label)}</span>
      <span class="bar" aria-hidden="true"><span style="width:${Math.max(4, (100 * m.score) / best).toFixed(0)}%"></span></span>
      ${url ? `<a class="cand-dist" href="${url}" target="_blank" rel="noopener noreferrer">watch<span aria-hidden="true"> ↗</span><span class="visually-hidden"> ${escapeHtml(m.label)} on Real SASL</span></a>` : ''}
    </li>`;
  }).join('');
  const n = inLesson.size || ranked.length;
  const wider = inLesson.size
    ? ` Across the whole dictionary the closest were ${ranked.slice(0, 3).map((r) => escapeHtml(r.label)).join(', ')} — less reliable at that size.`
    : '';
  const three = top.length === 3 && rateTop3(n) ? `, and ${rateTop3(n)}` : '';
  el.guessNote.innerHTML = `${inLesson.size ? `Out of your ${n} lesson words: ${rate(n)}${three}.` : `Out of all ${n.toLocaleString()} signs: ${rate(n)}. Pick a lesson and it gets far better.`}${wider}`;
  const attempt = state.lastAttempt;
  const canCompare = Boolean(attempt?.clip && attempt.mode === 'guess' && top.length);
  if (canCompare) attempt.choices = top.map((m) => m.label);
  el.guessActions.hidden = !canCompare;
  if (canCompare) el.guessCompare.querySelector('.btn-label').textContent = `Compare with ${splitLabel(top[0].label).head}`;
  setStep('see');
  revealResult(el.guessList.parentElement);
}

el.guessCompare.addEventListener('click', () => {
  const a = state.lastAttempt;
  if (a?.clip && a.choices?.length) openViewer({ label: a.choices[0], attempt: a, choices: a.choices });
});

/**
 * What a top answer is worth at this list size, measured (README, "How well it
 * works": 89% at 5 words, 82% at 10, 75% at 20, 63% at 50, 30% across all
 * 1,471). Nothing was measured between 50 words and the whole dictionary, so
 * a list in between is only placed between the two.
 */
function rate(n) {
  if (n <= 5) return 'the top answer is right about nine times in ten';
  if (n <= 12) return 'the top answer is right about four times in five';
  if (n <= 20) return 'the top answer is right about three times in four';
  if (n <= 50) return 'the top answer is right about two times in three';
  if (n < 1000) return 'the top answer is right less often than two times in three, and less the longer the list';
  return 'the top answer is right about three times in ten';
}

/** How often the right word is among the three listed (README: 99%, 96%, 91%, 81%). */
function rateTop3(n) {
  if (n <= 12) return 'almost always among these three';
  if (n <= 20) return 'about nine times in ten among these three';
  if (n <= 50) return 'about four times in five among these three';
  return '';
}

// --- Understand me ---------------------------------------------------------------

function renderUnderstandNote() {
  const lesson = el.uScope.value === 'lesson' && state.lesson.words.length;
  el.uNote.textContent = lesson
    ? `Read against your ${state.lesson.words.length} lesson words: the first guess is right about four times in five.`
    : 'Read against every sign in the dictionary: the first guess is right about one time in three, '
      + 'so check the other guesses under each sign. Your face and the signing space are not read yet, '
      + 'so a yes/no question comes out as a statement.';
}
el.uScope.addEventListener('change', renderUnderstandNote);

async function readUnderstand(rec) {
  let segments = findSegments(rec.vectors);
  if (!segments.length) segments = [{ start: 0, end: rec.times.length }];
  const lesson = el.uScope.value === 'lesson' ? lessonSet() : new Set();
  const pieces = [];
  for (const seg of segments) {
    const ranked = await rank(rec, seg.start, seg.end);
    pieces.push((lesson.size ? ranked.filter((r) => lesson.has(r.label)) : ranked).slice(0, 5));
  }
  const read = decode(pieces);
  state.understand.entries.unshift({ ...read, choice: read.signs.map((s) => s.label) });
  state.understand.entries.length = Math.min(state.understand.entries.length, 12);
  renderTranscript();
  el.framing.textContent = el.uListen.checked ? 'Listening. Sign again whenever you like.' : 'Ready for another.';
  setStep('see');
  revealResult(el.uTranscript.parentElement);
}

function renderTranscript() {
  const entries = state.understand.entries;
  el.uEmpty.hidden = entries.length > 0;
  el.uTranscript.innerHTML = entries.map((e, n) => {
    const said = toEnglish(e.choice);
    const chips = e.signs.map((s, i) => {
      const chosen = e.choice[i];
      const sure = s.alts.find((a) => a.label === chosen)?.p ?? 0;
      return `<label class="u-chip" data-sure="${sure > 0.6 ? 'high' : sure > 0.35 ? 'mid' : 'low'}">
        <span class="visually-hidden">Sign ${i + 1}</span>
        <select data-entry="${n}" data-pos="${i}">${s.alts.map((a) => `<option value="${escapeHtml(a.label)}"${a.label === chosen ? ' selected' : ''}>${escapeHtml(a.label)} · ${Math.round(a.p * 100)}%</option>`).join('')}</select></label>`;
    }).join('<span class="u-arrow" aria-hidden="true">→</span>');
    const clear = e.signs.filter((s, i) => (s.alts.find((a) => a.label === e.choice[i])?.p ?? 0) > 0.5).length;
    return `<li class="u-entry${n === 0 ? ' is-new' : ''}">
      <p class="u-signs">${chips}</p>
      <p class="u-english">“${escapeHtml(said.english || '…')}”</p>
      <p class="u-meta pencil small">${clear} of ${e.signs.length} sign${e.signs.length === 1 ? '' : 's'} read clearly${said.assumed.length ? ` · assumed ${escapeHtml(said.assumed.join('; '))}` : ''}
        · <button type="button" class="link-btn" data-u-sentence="${n}">See it in Sentences</button></p>
    </li>`;
  }).join('');
}

el.uTranscript.addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-entry]');
  if (!sel) return;
  const entry = state.understand.entries[Number(sel.dataset.entry)];
  entry.choice[Number(sel.dataset.pos)] = sel.value;
  renderTranscript();
});
el.uTranscript.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-u-sentence]');
  if (!b) return;
  const entry = state.understand.entries[Number(b.dataset.uSentence)];
  const english = toEnglish(entry.choice).english;
  setTab('sentences');
  await mountSentences();
  state.sentence.view?.setText(english);
});

// --- Phrases -------------------------------------------------------------------

async function readPhrase(rec) {
  const segments = findSegments(rec.vectors);
  if (!segments.length) {
    el.phraseList.innerHTML = '';
    el.phraseNote.textContent = 'No separate signs were found. Pause a little longer between signs '
      + '— the split is made where your hands slow down or drop.';
    el.framing.textContent = 'Ready for another.';
    revealResult(el.phraseList.parentElement);
    return;
  }
  // The sentence this try is for, as it was when the learner stopped: reading
  // takes a while, and they may pick another sentence meanwhile.
  const { plan, sentence } = state.sentence;
  if (plan) {
    const pieces = [];
    for (const seg of segments) pieces.push((await rank(rec, seg.start, seg.end)).slice(0, 200));
    const result = alignAttempt(plan, pieces, { labels: state.reference?.labels });
    state.sentence.view?.showAttempt(result, sentence);   // kept with its own sentence in Sentences
    if (state.sentence.plan && planKey(state.sentence.plan, state.sentence.sentence?.text) === planKey(plan, sentence?.text)) {
      showSentenceAttempt(result);
    } else {
      el.phraseList.innerHTML = '';
      el.phraseNote.textContent = 'That try was for the sentence before, so it is not shown here. Sign again when you are ready.';
    }
    el.framing.textContent = 'Ready for another try.';
    return;
  }
  const inLesson = lessonSet();
  const rows = [];
  for (const seg of segments) {
    const ranked = await rank(rec, seg.start, seg.end);
    const pool = inLesson.size ? ranked.filter((r) => inLesson.has(r.label)) : ranked;
    rows.push(pool.slice(0, 3));
  }
  showPhrase(rows);
  el.framing.textContent = 'Ready for another.';
}

/** One row per sign found: the best reading, then the next two guesses. */
function showPhrase(rows) {
  const inLesson = lessonSet();
  el.phraseList.innerHTML = rows.map((top) => `
    <li><span class="phrase-word">${escapeHtml(top[0]?.label ?? '?')}</span>
      ${top.length > 1 ? `<span class="phrase-alts">or ${top.slice(1).map((t) => escapeHtml(t.label)).join(' · ')}</span>` : ''}</li>`)
    .join('');
  el.phraseNote.textContent = `${rows.length} sign${rows.length === 1 ? '' : 's'} found, each read `
    + `on its own against ${inLesson.size ? `your ${inLesson.size} lesson words` : 'the whole dictionary'}. `
    + 'The smaller words are the next guesses for each.';
  setStep('see');
  revealResult(el.phraseList.parentElement);
}

function setSignMode(mode) {
  state.signMode = mode;
  for (const b of document.querySelectorAll('[data-signmode]')) {
    b.setAttribute('aria-pressed', String(b.dataset.signmode === mode));
  }
  el.quiz.hidden = mode !== 'quiz';
  el.guess.hidden = mode !== 'guess';
  el.phrase.hidden = mode !== 'phrase';
  el.understand.hidden = mode !== 'understand';
  if (mode === 'understand') renderUnderstandNote();
  el.camWord.hidden = mode !== 'quiz' || !state.quiz.word;
  setStep(mode === 'quiz' ? 'watch' : 'sign');
}

for (const btn of document.querySelectorAll('[data-signmode]')) {
  btn.addEventListener('click', () => setSignMode(btn.dataset.signmode));
}

// --- Lessons -------------------------------------------------------------------

function restoreLesson() {
  try {
    const saved = JSON.parse(localStorage.getItem('lesson') ?? 'null');
    if (saved?.words) {
      const known = new Set(state.reference.labels);
      state.lesson = { id: saved.id ?? 'custom', words: saved.words.filter((w) => known.has(w)) };
      return;
    }
  } catch { /* storage unavailable: start from the default lesson */ }
  // Greetings first: HELLO and THANK YOU are a friendlier first attempt than 100000.
  const first = state.lessons.find((l) => l.topic === 'Greetings and manners') ?? state.lessons[0];
  state.lesson = { id: first.id, words: [...first.words] };
}

function saveLesson() {
  if (state.demo) return;              // ?demo= pages never change what the learner saved
  try {
    localStorage.setItem('lesson', JSON.stringify(state.lesson));
  } catch { /* private window: the lesson lasts for this visit */ }
}

/** A lesson title for the contents page: "(NID chart)" becomes a small tag. */
function lessonTitleHtml(title) {
  const nid = /\s*\(NID chart\)/i.test(title);
  const bare = title.replace(/\s*\(NID chart\)/i, '');
  return `${escapeHtml(bare)}${nid ? ' <span class="tag" title="From the National Institute for the Deaf sign charts">NID</span>' : ''}`;
}

function currentLessonTitle() {
  const l = state.lessons.find((x) => x.id === state.lesson.id);
  return l ? l.title : 'My own list';
}

/**
 * The contents page, one row per topic: "Feelings 1", "Feelings 2" and
 * "Feelings 3" become one row, Feelings, with three numbered parts.
 */
function lessonGroups() {
  const groups = new Map();
  for (const l of state.lessons) {
    const m = /^(.*?)\s+(\d+)$/.exec(l.title);
    const name = m ? m[1] : l.title;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ lesson: l, part: m ? m[2] : null });
  }
  return [...groups.entries()].map(([name, parts]) => ({ name, parts }));
}

function renderLessonSelect() {
  const count = (l) => `${l.words.length}<span class="visually-hidden"> words</span>`;
  el.lessonSelect.innerHTML = lessonGroups().map(({ name, parts }) => {
    if (parts.length === 1) {
      const l = parts[0].lesson;
      return `
    <li><button class="lesson-btn" type="button" data-lesson-id="${escapeHtml(l.id)}" aria-pressed="false">
      <span class="lesson-name">${lessonTitleHtml(l.title)}</span><span class="leader" aria-hidden="true"></span>
      <span class="lesson-count">${count(l)}</span></button></li>`;
    }
    return `
    <li class="lesson-group"><span class="lesson-name">${lessonTitleHtml(name)}</span><span class="leader" aria-hidden="true"></span>
      <span class="lesson-parts">${parts.map(({ lesson: l, part }) => `<button class="part-btn" type="button"
        data-lesson-id="${escapeHtml(l.id)}" aria-pressed="false" title="${l.words.length} words"
        aria-label="${escapeHtml(l.title)}, ${l.words.length} words">${part}</button>`).join('')}</span></li>`;
  }).join('') + `
    <li><button class="lesson-btn own" type="button" data-lesson-id="custom" aria-pressed="false">
      <span class="lesson-name">My own list</span><span class="leader" aria-hidden="true"></span>
      <span class="lesson-count" id="own-count"></span></button></li>`;
  markLesson();
}

function markLesson() {
  for (const b of el.lessonSelect.querySelectorAll('[data-lesson-id]')) {
    b.setAttribute('aria-pressed', String(b.dataset.lessonId === state.lesson.id));
  }
  const own = $('#own-count');
  if (own) own.textContent = state.lesson.id === 'custom' ? String(state.lesson.words.length) : '';
}

function pickLesson(id) {
  state.clearedLesson = null;
  const l = state.lessons.find((x) => x.id === id);
  state.lesson = l ? { id: l.id, words: [...l.words] } : { id: 'custom', words: [...state.lesson.words] };
  state.quiz = { word: null, tried: 0, right: 0, misses: new Map(), log: [] };
  saveLesson();
  renderLesson();
}

el.lessonSelect.addEventListener('click', (e) => {
  const id = e.target.closest('[data-lesson-id]')?.dataset.lessonId;
  if (id) pickLesson(id);
});

function editLesson(change) {
  state.clearedLesson = null;          // any change after a clear keeps the new list
  change(state.lesson.words);
  state.lesson.id = 'custom';
  saveLesson();
  renderLesson();
}

function renderLesson() {
  const words = state.lesson.words;
  renderLessonChips();
  el.lessonNote.textContent = words.length
    ? `${words.length} word${words.length === 1 ? '' : 's'}. Your tries are compared with these — ${rate(words.length)}.`
    : 'Pick a lesson from the contents, or add signs one at a time.';
  const title = currentLessonTitle();
  el.lessonLink.textContent = title;
  el.lessonTitle.textContent = title;
  el.lessonSize.textContent = `· ${words.length} word${words.length === 1 ? '' : 's'}`;
  markLesson();
  if (!words.includes(state.quiz.word)) pickQuizWord();
  el.guessIntro.textContent = words.length
    ? 'Sign any word from your lesson and this names it.'
    : 'With no lesson, tries are compared with all 1,471 signs, which is much less reliable.';
  renderLessonUndo();
  // The drawer's "In lesson" / "+ Lesson" buttons follow the lesson however it changed.
  renderDictionary(el.dictInput.value);
}

/** The lesson's words as kraft chips, each with a pencil tally of its matches. */
function renderLessonChips() {
  const words = state.lesson.words;
  el.lessonChips.innerHTML = words.map((w) => {
    const n = matchedCount(w);
    return `<span class="chip${n ? ' has-tally' : ''}">${escapeHtml(w)}${tallyHtml(n)}<button type="button" data-remove="${escapeHtml(w)}" aria-label="Remove ${escapeHtml(w)}">×</button></span>`;
  }).join('');
  const matched = words.filter((w) => matchedCount(w) > 0).length;
  el.lessonProgress.textContent = !words.length ? ''
    : matched ? `${matched} of ${words.length} matched at least once on this computer.`
      : 'No tallies yet: each match in the quiz adds a pencil stroke to its word.';
  el.progressClear.hidden = state.progress.size === 0;
}

// --- Progress: tallies of matched signs, kept on this computer --------------

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem('progress') ?? '{}');
    return new Map(Object.entries(saved ?? {}).filter(([, n]) => Number.isInteger(n) && n > 0));
  } catch {
    return new Map();   // storage unavailable: tallies last for this visit
  }
}

function saveProgress() {
  if (state.demo) return;
  try {
    localStorage.setItem('progress', JSON.stringify(Object.fromEntries(state.progress)));
  } catch { /* private window: the tallies last for this visit */ }
}

function matchedCount(word) {
  return state.progress.get(word) ?? 0;
}

function recordMatch(word) {
  state.progress.set(word, matchedCount(word) + 1);
  saveProgress();
  renderLessonChips();
  renderQuizProgress();
}

const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/**
 * Pencil tally marks: four strokes and a fifth across them, then "+n". Drawn,
 * not coloured, so the count reads without colour; `said` adds the words for
 * screen readers where nothing nearby says them.
 */
function tallyHtml(n, said = true) {
  if (!n) return '';
  const k = Math.min(n, 5);
  const strokes = [];
  for (let i = 0; i < Math.min(k, 4); i++) {
    const x = 3 + i * 4;
    strokes.push(`<path d="M${x + (i % 2 ? 0.4 : -0.3)} 2.6 L${x + (i % 2 ? -0.3 : 0.5)} 12.6"/>`);
  }
  if (k === 5) strokes.push('<path d="M0.8 11.2 L17.6 3.6"/>');
  return `<span class="tally" title="Matched ${times(n)}"><svg viewBox="0 0 19 15" aria-hidden="true" focusable="false">${strokes.join('')}</svg>`
    + `${n > 5 ? `<span class="tally-more" aria-hidden="true">+${n - 5}</span>` : ''}`
    + `${said ? `<span class="visually-hidden">, matched ${times(n)}</span>` : ''}</span>`;
}

el.progressClear.addEventListener('click', () => {
  // The tallies are the learner's own record: ask before wiping them.
  if (!window.confirm('Clear every tally of matched signs on this computer?')) return;
  state.progress.clear();
  saveProgress();
  renderLessonChips();
  renderQuizProgress();
});

el.lessonChips.addEventListener('click', (e) => {
  const word = e.target.closest('[data-remove]')?.dataset.remove;
  if (word) editLesson((ws) => ws.splice(ws.indexOf(word), 1));
});

// Clearing is one click, so it can be undone: the old list is kept (in memory)
// until the lesson changes again, and Undo takes the place of the button.
el.lessonClear.addEventListener('click', () => {
  if (!state.lesson.words.length) return;
  const before = { id: state.lesson.id, words: [...state.lesson.words] };
  editLesson((ws) => ws.splice(0));
  state.clearedLesson = before;
  renderLessonUndo();
  el.lessonUndo.focus();
});

el.lessonUndo.addEventListener('click', () => {
  const before = state.clearedLesson;
  if (!before) return;
  state.clearedLesson = null;
  state.lesson = before;
  saveLesson();
  renderLesson();
  el.lessonClear.focus();
});

function renderLessonUndo() {
  const undo = Boolean(state.clearedLesson);
  el.lessonCleared.hidden = !undo;
  el.lessonClear.hidden = undo || !state.lesson.words.length;
}

function suggest(query) {
  const q = query.trim().toUpperCase();
  const have = lessonSet();
  const hits = q ? state.reference.labels.filter((l) => l.includes(q) && !have.has(l))
    .sort((a, b) => (a.startsWith(q) ? 0 : 1) - (b.startsWith(q) ? 0 : 1) || a.length - b.length)
    .slice(0, 8) : [];
  el.lessonSuggestions.innerHTML = hits.map((h) =>
    `<li><button type="button" data-add="${escapeHtml(h)}">${icon('plus')}${escapeHtml(h)}</button></li>`).join('');
  el.lessonSuggestions.hidden = !hits.length;
}

el.lessonInput.addEventListener('input', () => suggest(el.lessonInput.value));

el.lessonSuggestions.addEventListener('click', (e) => {
  const word = e.target.closest('[data-add]')?.dataset.add;
  if (!word) return;
  editLesson((ws) => { if (!ws.includes(word)) ws.push(word); });
  el.lessonInput.value = '';
  el.lessonSuggestions.hidden = true;
  el.lessonInput.focus();
});

// --- Dictionary ---------------------------------------------------------------

function renderDictionary(query) {
  const q = query.trim().toUpperCase();
  const labels = state.reference?.labels ?? [];
  const hits = q ? labels.filter((l) => l.includes(q)) : labels;
  const shown = hits.slice(0, 80);
  const have = lessonSet();
  el.dictCount.textContent = q
    ? `${hits.length} sign${hits.length === 1 ? '' : 's'} match “${query.trim()}”${hits.length > shown.length ? ` — showing ${shown.length}` : ''}.`
    : `${labels.length.toLocaleString()} signs, A to Z. Type to search; the first ${shown.length} are shown.`;
  el.dictList.innerHTML = shown.map((l) => {
    const url = realSaslUrl(l);
    const { head, note } = splitLabel(l);
    const lesson = state.wordLesson.get(l);
    const inLesson = have.has(l);
    // The headword has the card's whole width and wraps: signs that differ
    // only at the end (BLOOD PRESSURE, … HIGH, … LOW) must not look alike.
    return `<li class="j-index-card dict-card">
      <h3 class="dict-word">${escapeHtml(head)}</h3>
      ${note ? `<p class="dict-note">${escapeHtml(note)}</p>` : ''}
      ${url ? `<p class="dict-src-line"><a class="dict-src" href="${url}" target="_blank" rel="noopener noreferrer">Video on Real SASL<span aria-hidden="true"> ↗</span><span class="visually-hidden">: ${escapeHtml(l)} (opens in a new tab)</span></a></p>` : ''}
      ${lesson ? `<p class="dict-where">In the lesson ${lessonTitleHtml(lesson.title)}</p>` : ''}
      <div class="dict-actions">
        <button class="mini" type="button" data-watch="${escapeHtml(l)}" aria-haspopup="dialog">${icon('play')}Watch<span class="visually-hidden"> ${escapeHtml(l)}, drawn</span></button>
        ${lessonButtonHtml(l, inLesson)}
      </div></li>`;
  }).join('');
}

function lessonButtonHtml(label, inLesson) {
  return `<button class="mini" type="button" data-lesson="${escapeHtml(label)}" ${inLesson ? 'disabled' : ''}
          aria-label="${inLesson ? `${escapeHtml(label)} is in your lesson` : `Add ${escapeHtml(label)} to your lesson`}">
          ${inLesson ? `${icon('check')}In lesson` : `${icon('plus')}Lesson`}</button>`;
}

function addToLesson(word) {
  editLesson((ws) => { if (!ws.includes(word)) ws.push(word); });
}

el.dictInput.addEventListener('input', () => renderDictionary(el.dictInput.value));
el.dictList.addEventListener('click', (e) => {
  const watch = e.target.closest('[data-watch]')?.dataset.watch;
  if (watch) { openViewer({ label: watch }); return; }
  const word = e.target.closest('[data-lesson]')?.dataset.lesson;
  if (word) addToLesson(word);
});

// --- Fingerspelling ----------------------------------------------------------

const DIAL_CIRCUMFERENCE = 327;
const MOTION_LETTERS = new Set(['J', 'Z']);
const SPELL_WORDS = [
  'CAT', 'DOG', 'SUN', 'NAME', 'SIGN', 'DEAF', 'LOVE', 'HOME', 'BREAD', 'WATER', 'MOTHER',
  'FRIEND', 'FAMILY', 'SOUTH', 'AFRICA', 'CAPE', 'THABO', 'LERATO', 'SIPHO', 'NALEDI',
  'PIETER', 'ANNA', 'ZANELE', 'JABU', 'THANDI', 'KAGISO', 'DURBAN', 'SOWETO', 'LIMPOPO',
];
// A tip for every letter on the plate: what makes the shape, and the letter it
// is most easily taken for. D and Q are the letters the camera reads least
// surely, M and N differ by one finger, and SASL's T is not the American one
// (README, "Findings worth keeping").
const LETTER_TIPS = {
  A: 'Close your fist and rest the thumb up the side of the index finger. With the thumb across the front of the fingers it becomes S.',
  B: 'Hold the hand flat, fingers straight and together, palm towards the camera.',
  C: 'Curve the fingers and thumb into the shape of a C, as if round a small cup.',
  D: 'Index finger straight up; the other fingertips curl round to meet the thumb. D is one of the letters the camera reads least surely, so hold it still.',
  E: 'Fold all four fingertips down towards the palm, bent at the knuckles rather than closed in a fist.',
  F: 'Touch the tips of the thumb and index finger; keep the other three fingers clear of them.',
  G: 'Point sideways with your index finger. Turn the same hand to point down and it becomes Q.',
  H: 'Point sideways with the index and middle fingers together. One finger is G.',
  I: 'Little finger up, the other fingers closed.',
  J: 'Make I (little finger up), then draw a J in the air with the little finger: down, then hook to the side. It is read from the movement, so make it clear and not too fast.',
  K: 'Index and middle finger up, the thumb between them. Turn it to point down and it becomes P.',
  L: 'Thumb and index finger out at a right angle, like the letter L.',
  M: 'Fold three fingers over the thumb. With two it is N: the two differ by a single finger, so keep them distinct.',
  N: 'Fold two fingers over the thumb. With three it is M.',
  O: 'Bring all the fingertips round to meet the thumb in a round O.',
  P: 'The K hand, turned to point down.',
  Q: 'The G hand, turned to point down. Q is the letter the camera reads least surely: hold it still, in clear view.',
  R: 'Index and middle finger up and crossed. Side by side it is U; apart, V.',
  S: 'A fist with the thumb across the front of the fingers. Thumb up the side is A; index folded over the thumb tip is T.',
  T: 'Fold your index finger down over the tip of your thumb. The American T, with the thumb between the index and middle finger, is not the South African one.',
  U: 'Index and middle finger up, together. Apart it is V; crossed, R.',
  V: 'Index and middle finger up and apart. Together it is U.',
  W: 'Three fingers up and apart.',
  X: 'Raise the index finger and hook it; the other fingers stay closed.',
  Y: 'Thumb and little finger out, the middle three fingers closed — the same as the American Y.',
  Z: 'Point with the index finger, the other fingers closed, and draw a Z in the air as you would write it: across, back down the diagonal, across again.',
};
// Captions for Plate I: one line on what each drawn hand is doing.
const PLATE_NOTES = {
  A: 'Fist, thumb up the side', B: 'Flat hand, fingers together', C: 'Curved like the letter',
  D: 'Index up, others touch the thumb', E: 'Fingertips folded down', F: 'Thumb and index touch',
  G: 'Index points sideways', H: 'Two fingers point sideways', I: 'Little finger up',
  J: 'I hand, draws a J',
  K: 'Index and middle, thumb between', L: 'Thumb and index at a right angle',
  M: 'Three fingers over the thumb', N: 'Two fingers over the thumb', O: 'Fingertips meet the thumb',
  P: 'Like K, pointing down', Q: 'Like G, pointing down', R: 'Middle crossed over index',
  S: 'Fist, thumb across the front', T: 'Index folded over the thumb tip',
  U: 'Index and middle up, together', V: 'Index and middle up, apart', W: 'Three fingers up, apart',
  X: 'Index hooked', Y: 'Thumb and little finger out', Z: 'Index finger draws a Z',
};
const handSrc = (c) => `assets/hands/ink/${c}.svg`;

/** Plate I: every hand a button that lays it out larger, with its tip. */
function renderPlate() {
  el.plateGrid.innerHTML = Object.entries(PLATE_NOTES).map(([c, note]) => `
    <button class="j-plate-cell plate-btn" type="button" data-letter="${c}" aria-haspopup="dialog">
      <img class="j-art--ink" src="${handSrc(c)}" alt="" width="100" height="100" loading="lazy">
      <span class="cell-cap"><b>${c}</b><span class="visually-hidden">: </span>${note}</span>
      <span class="visually-hidden"> — enlarge, with a tip</span>
    </button>`).join('');
}

el.plateGrid.addEventListener('click', (e) => {
  const letter = e.target.closest('[data-letter]')?.dataset.letter;
  if (letter) openLoupe(letter);
});

/**
 * Mark the plate: the letter to make next (ringed), and the letter the camera
 * is reading right now (lit) - the same cell when the learner has it right.
 */
function markPlate(want, read) {
  for (const cell of el.plateGrid.children) {
    cell.classList.toggle('is-wanted', cell.dataset.letter === want);
    cell.classList.toggle('is-read', cell.dataset.letter === read);
  }
}

/** Spell a word: the drawing of the letter to make next, beside the word. */
function showCue(letter) {
  if (letter === state.spell.cue) return;
  state.spell.cue = letter;
  const note = PLATE_NOTES[letter];
  el.spellCue.classList.toggle('empty', !note);
  el.spellCueBtn.hidden = !note;
  el.spellCueLetter.textContent = note ? letter : '';
  el.spellCueNote.textContent = note ?? '';
  if (!note) return;
  el.spellCueImg.src = handSrc(letter);
  el.spellCueLabel.textContent = `Show the letter ${letter} larger, with a tip`;
}

el.spellCueBtn.addEventListener('click', () => { if (state.spell.cue) openLoupe(state.spell.cue); });

/** Free spelling: the drawing beside the dial is the letter the camera reads. */
function showGuide(letter) {
  if (letter === state.spell.shown) return;
  state.spell.shown = letter;
  const note = PLATE_NOTES[letter];
  el.spellGuide.hidden = !note;
  if (!note) return;
  el.spellGuideImg.src = handSrc(letter);
  el.spellGuideImg.alt = `SASL letter ${letter}: ${note}`;
  el.spellGuideCap.innerHTML = `<b>${letter}</b> ${escapeHtml(note)}`;
}

function setDial(fraction, unsure) {
  el.dialFill.style.strokeDashoffset = String(DIAL_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction))));
  el.dialFill.parentElement.parentElement.classList.toggle('unsure', Boolean(unsure));
}

/** Show one smoothed reading (or none, when no hand is in view). */
function showReading(read) {
  if (!read) {
    el.spellLetter.textContent = '–';
    el.spellConfidence.textContent = 'No hand in view';
    el.spellAlts.textContent = '';
    setDial(0, false);
    if (state.spell.mode === 'free') showGuide(null);
    markPlate(state.spell.mode === 'word' ? state.spell.target[state.spell.index] : null, null);
    return;
  }
  const { letter, p } = read.best;
  const sure = p >= LETTER_SURE;
  el.spellLetter.textContent = sure ? letter : '?';
  setDial(p, !sure);
  el.spellConfidence.textContent = sure ? `${letter} — ${(p * 100).toFixed(0)}% sure` : 'Not sure yet — hold the shape still';
  el.spellAlts.textContent = `Also close: ${[sure ? null : letter, ...read.alternatives.map((a) => a.letter)]
    .filter(Boolean).slice(0, 2).join(', ')}`;
  if (state.spell.mode === 'free') showGuide(sure ? letter : null);
  markPlate(state.spell.mode === 'word' ? state.spell.target[state.spell.index] : null, sure ? letter : null);
}

function updateSpelling(handResult, ts) {
  const sp = state.spell;
  const hand = spellingHand(handResult);
  if (!hand) {
    sp.reader.clear();
    sp.motion.clear();
    sp.candidate = null;
    sp.armed = true;
    showReading(null);
    return;
  }
  const aspect = el.video.videoWidth / el.video.videoHeight;
  sp.reader.push(letterLogProbs(letterFeatures(hand.img, hand.world, aspect)));
  const read = sp.reader.read();
  showReading(read);
  // J and Z are drawn, not held: read from the fingertip's path (src/motion-letters.js)
  const drawn = sp.motion.push({ t: ts, img: hand.img, world: hand.world, aspect });
  if (drawn) { motionLetter(drawn, ts); return; }
  const { letter, p } = read.best;
  const sure = p >= LETTER_SURE;

  // A letter counts once it has been held; the same letter counts again only
  // after the hand changes shape, leaves, or holds on well past the first.
  const reading = sure ? letter : null;
  if (reading !== sp.candidate) {
    sp.candidate = reading;
    sp.since = ts;
    sp.armed = true;
  } else if (reading && !sp.armed && ts - sp.since > DOUBLE_LETTER_MS) {
    sp.since = ts;
    sp.armed = true;
  }
  const held = reading && sp.armed && ts - sp.since > LETTER_HOLD_MS;

  if (sp.mode === 'free') {
    if (held) {
      sp.committed.push(reading);
      sp.committedAt.push(ts);
      sp.armed = false;
      sp.since = ts;
      el.spellBuffer.textContent = sp.committed.join('');
    }
    return;
  }

  const want = sp.target[sp.index];
  if (!want) return;
  if (held && reading === want) {
    sp.index += 1;
    sp.armed = false;
    sp.since = ts;
    sp.wrongSince = 0;
    renderSpellWord();
  } else if (reading && reading !== want && !MOTION_LETTERS.has(want)) {
    if (!sp.wrongSince) sp.wrongSince = ts;
    if (ts - sp.wrongSince > 1400) {
      el.spellHint.textContent = `That reads as ${reading}, not ${want}. ${LETTER_TIPS[want] ?? ''}`;
    }
  } else {
    sp.wrongSince = 0;
  }
}

/** A J or Z has been drawn. Held letters read on the way (the I that starts a J) give way to it. */
function motionLetter({ letter, start }, ts) {
  const sp = state.spell;
  sp.armed = false;
  sp.since = ts;
  sp.candidate = null;
  flashMotion(letter);
  if (sp.mode === 'free') {
    while (sp.committedAt.length && sp.committedAt[sp.committedAt.length - 1] >= start - 100) {
      sp.committed.pop();
      sp.committedAt.pop();
    }
    sp.committed.push(letter);
    sp.committedAt.push(ts);
    el.spellBuffer.textContent = sp.committed.join('');
    return;
  }
  const want = sp.target[sp.index];
  if (letter === want) {
    sp.index += 1;
    sp.wrongSince = 0;
    renderSpellWord();
  } else if (want) {
    el.spellHint.textContent = `That was ${letter}, drawn — the next letter is ${want}. ${LETTER_TIPS[want] ?? ''}`;
  }
}

/** Show a drawn letter in the readout for a moment, as a held one would be. */
function flashMotion(letter) {
  el.spellLetter.textContent = letter;
  el.spellConfidence.textContent = `${letter} — drawn`;
  el.spellAlts.textContent = '';
  setDial(1, false);
  if (state.spell.mode === 'free') showGuide(letter);
}

function newSpellWord(word) {
  const sp = state.spell;
  const fromLesson = state.lesson.words.filter((w) => /^[A-Z]{3,8}$/.test(w));
  const pool = [...new Set([...fromLesson, ...SPELL_WORDS])].filter((w) => w !== sp.target);
  sp.target = (word ?? pool[Math.floor(Math.random() * pool.length)]).toUpperCase().replace(/[^A-Z]/g, '');
  sp.index = 0;
  sp.wrongSince = 0;
  renderSpellWord();
}

function renderSpellWord() {
  const sp = state.spell;
  el.spellWord.innerHTML = [...sp.target].map((c, i) => {
    const cls = i < sp.index ? 'done' : i === sp.index ? 'current' : 'todo';
    const said = { done: ', done', current: ', next', todo: '' }[cls];
    return `<span class="${cls}"><span aria-hidden="true">${c}</span><span class="visually-hidden">${c}${said}</span></span>`;
  }).join('');
  const want = sp.target[sp.index];
  el.spellHint.textContent = !want ? 'Spelled. Well done — try another.'
    : MOTION_LETTERS.has(want) ? `Draw ${want}: ${LETTER_TIPS[want]}`
      : `Hold ${want} steady.`;
  el.spellWord.classList.toggle('spelled', !want);
  if (sp.mode === 'word') {
    showCue(want ?? null);
    showGuide(null);
  }
  markPlate(sp.mode === 'word' ? want : null, null);
}

el.spellNext.addEventListener('click', () => { el.spellCustom.value = ''; newSpellWord(); });
el.spellCustom.addEventListener('change', () => {
  const w = el.spellCustom.value.trim();
  if (/[A-Za-z]/.test(w)) newSpellWord(w);
});

function setSpellMode(mode) {
  state.spell.mode = mode;
  for (const b of document.querySelectorAll('[data-spellmode]')) {
    b.setAttribute('aria-pressed', String(b.dataset.spellmode === mode));
  }
  el.spellTarget.hidden = mode !== 'word';
  el.spellFree.hidden = mode !== 'free';
  state.spell.shown = undefined;
  if (mode === 'word') renderSpellWord();
  else { showGuide(null); markPlate(null, null); }
}

for (const btn of document.querySelectorAll('[data-spellmode]')) {
  btn.addEventListener('click', () => setSpellMode(btn.dataset.spellmode));
}

el.spellClear.addEventListener('click', () => {
  state.spell.committed = [];
  state.spell.committedAt = [];
  el.spellBuffer.textContent = '';
});

// --- Plate I, one hand enlarged ------------------------------------------------

const PLATE_LETTERS = Object.keys(PLATE_NOTES);
// Where each drawn hand was traced from (assets/hands/hands.json, by video).
const HAND_SOURCES = {
  signtutors: 'The Sign Tutors’ “A–Z (Alphabet) in South African Sign Language”',
  nid: 'the National Institute for the Deaf’s “The A–Z of Fingerspelling”',
};
let handInfo = null;

function loadHandInfo() {
  handInfo ??= fetch('assets/hands/hands.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return handInfo;
}

async function openLoupe(letter) {
  const i = PLATE_LETTERS.indexOf(letter);
  if (i < 0) return;
  state.spell.loupe = letter;
  el.loupeTitle.textContent = letter;
  el.loupeImg.src = handSrc(letter);
  el.loupeImg.alt = `SASL letter ${letter}, drawn larger: ${PLATE_NOTES[letter]}`;
  el.loupeNote.textContent = PLATE_NOTES[letter];
  el.loupeTip.textContent = LETTER_TIPS[letter] ?? '';
  const step = (d) => PLATE_LETTERS[(i + d + PLATE_LETTERS.length) % PLATE_LETTERS.length];
  for (const [btn, to, word] of [[el.loupePrev, step(-1), 'Previous'], [el.loupeNext, step(1), 'Next']]) {
    btn.dataset.letter = to;
    btn.querySelector('span').textContent = to;
    btn.setAttribute('aria-label', `${word} letter, ${to}`);
  }
  el.loupeCount.textContent = `${i + 1} of ${PLATE_LETTERS.length}`;
  el.loupeSrc.textContent = '';
  if (!el.loupe.open) el.loupe.showModal();
  const info = await loadHandInfo();
  if (state.spell.loupe !== letter) return;
  const base = { J: 'I', Z: 'D' }[letter];
  const src = info?.letters?.[base ?? letter];
  el.loupeSrc.textContent = !src ? ''
    : base ? `The hand is traced from a hand-checked hold of ${base} in ${HAND_SOURCES[src.video] ?? `“${src.presenter}”`}; the arrow shows the movement.`
      : `Traced from a hand-checked hold of ${letter} in ${HAND_SOURCES[src.video] ?? `“${src.presenter}”`}.`;
}

for (const btn of [el.loupePrev, el.loupeNext]) {
  btn.addEventListener('click', () => openLoupe(btn.dataset.letter));
}
el.loupe.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); openLoupe(el.loupePrev.dataset.letter); }
  if (e.key === 'ArrowRight') { e.preventDefault(); openLoupe(el.loupeNext.dataset.letter); }
});
el.loupe.addEventListener('close', () => { state.spell.loupe = null; });

// --- Watching a sign: the drawn signer --------------------------------------------
//
// The figure (src/figure.js, driven by src/watch.js) performs the Real SASL
// reference: under the quiz word, and larger on the desk (the viewer dialog)
// from a dictionary card or beside the learner's own last try (Compare). In
// the quiz it waits, paused mid-sign, until Play; under prefers-reduced-motion
// it waits everywhere. Speed and the left-handed mirror are the learner's.

const STILL_AT = 0.45;     // a paused figure shows the middle of the sign, not the rest before it
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

function loadWatchPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem('watch') ?? 'null');
    return { speed: saved?.speed === 0.5 ? 0.5 : 1, mirror: saved?.mirror === true };
  } catch {
    return { speed: 1, mirror: false };   // storage unavailable
  }
}

function saveWatchPrefs() {
  if (state.demo) return;
  try {
    localStorage.setItem('watch', JSON.stringify({ speed: state.watch.speed, mirror: state.watch.mirror }));
  } catch { /* the settings last for this visit */ }
}

function setWatchPref(change) {
  Object.assign(state.watch, change);
  saveWatchPrefs();
  for (const stage of [state.watch.quiz, state.watch.viewer]) {
    if (!stage) continue;
    stage.setSpeed(state.watch.speed);
    stage.setMirror(0, state.watch.mirror);   // the reference only: see openViewer
  }
  syncPlayer(el.quizPlayer, state.watch.quiz);
  syncPlayer(el.viewerPlayer, state.watch.viewer);
}

/** Bring one set of player controls in line with its stage (or with none yet). */
function syncPlayer(root, stage) {
  const play = root.querySelector('[data-act="play"]');
  const playing = Boolean(stage?.playing);
  play.disabled = !stage;
  play.querySelector('use').setAttribute('href', `${ICONS}#${playing ? 'pause' : 'play'}`);
  play.querySelector('.btn-label').textContent = playing ? 'Pause' : 'Play';
  for (const b of root.querySelectorAll('[data-speed]')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.watch.speed));
  }
  root.querySelector('[data-act="mirror"]').setAttribute('aria-pressed', String(state.watch.mirror));
  const larger = root.querySelector('[data-act="larger"]');
  if (larger) larger.disabled = !stage;
  const seek = root.querySelector('[data-act="seek"]');
  if (seek) seek.disabled = !stage;
}

function wirePlayer(root, stageOf, { larger } = {}) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'play') stageOf()?.toggle();
    else if (b.dataset.speed) setWatchPref({ speed: Number(b.dataset.speed) });
    else if (b.dataset.act === 'mirror') setWatchPref({ mirror: !state.watch.mirror });
    else if (b.dataset.act === 'larger') larger?.();
  });
  const seek = root.querySelector('[data-act="seek"]');
  seek?.addEventListener('input', () => {
    const stage = stageOf();
    if (!stage) return;
    stage.pause();
    stage.seek(Number(seek.value) / 1000);
  });
}

wirePlayer(el.quizPlayer, () => state.watch.quiz, {
  larger: () => { if (state.quiz.word) openViewer({ label: state.quiz.word }); },
});
wirePlayer(el.viewerPlayer, () => state.watch.viewer);
syncPlayer(el.quizPlayer, null);
syncPlayer(el.viewerPlayer, null);

function figureStatus(node, text) {
  node.textContent = text;
  node.hidden = !text;
}

/** The quiz's figure: the word to sign, paused in the middle of the sign until Play. */
async function renderQuizFigure(word, { at = STILL_AT } = {}) {
  if (word && word === state.watch.quizWord && state.watch.quiz) return;
  const token = ++state.watch.quizToken;
  state.watch.quiz?.destroy();
  state.watch.quiz = null;
  state.watch.quizWord = word;
  syncPlayer(el.quizPlayer, null);
  el.quizPlate.hidden = !word;
  if (!word) return;
  el.quizFigure.setAttribute('aria-label', `A drawn signer performing ${word} in SASL, from the Real SASL clip`);
  el.quizPlate.classList.add('waiting');
  figureStatus(el.quizFigureStatus, 'Drawing the signer…');
  let clip = null;
  try {
    clip = await referenceClip(word);
  } catch {
    if (token === state.watch.quizToken) {
      figureStatus(el.quizFigureStatus, 'The drawing did not load. The Real SASL video still works.');
    }
    return;
  }
  if (token !== state.watch.quizToken) return;
  if (!clip) {
    figureStatus(el.quizFigureStatus, 'No drawing of this sign yet. Watch it on Real SASL.');
    return;
  }
  el.quizPlate.classList.remove('waiting');
  figureStatus(el.quizFigureStatus, '');
  const stage = createStage([el.quizFigure], [clip], {
    mirror: [state.watch.mirror],
    onState: () => syncPlayer(el.quizPlayer, stage),
  });
  stage.setSpeed(state.watch.speed);
  stage.seek(at);
  state.watch.quiz = stage;
  syncPlayer(el.quizPlayer, stage);
}

function attemptCaption(a) {
  return a.n ? `Your try ${a.n}${a.kind ? ` — ${VERDICTS[a.kind].log}` : ''}` : 'Your last try';
}

/** Compare the last quiz try with the word it was for. */
function compareLastTry() {
  const a = state.lastAttempt;
  if (a?.clip && a.word) openViewer({ label: a.word, attempt: a });
}

/**
 * The viewer on the desk. Watch: one figure, larger, with a scrubber.
 * Compare: the reference and the learner's last try side by side on one
 * clock, the try stretched to the reference's length. Both are drawn as
 * someone facing the signer sees them, so dominant hands line up; the
 * left-handed switch mirrors only the reference, which is what a left-handed
 * signer's try should then match. `at` pauses at a point instead of playing.
 */
async function openViewer({ label, attempt = null, choices = null, at = null, variant = 0 }) {
  const token = ++state.watch.viewerToken;
  stopViewerStage();
  state.watch.quiz?.pause();
  const compare = Boolean(attempt?.clip);
  state.watch.open = { label, attempt: compare ? attempt : null, choices, variant };
  $('#viewer-variant-label').hidden = true;
  const { head, note } = splitLabel(label);
  el.viewerKind.textContent = compare ? 'Compare · your try beside the reference' : 'Watch the sign';
  el.viewerTitle.textContent = head;
  el.viewerNote.textContent = note;
  el.viewerNote.hidden = !note;
  el.viewerFigs.classList.toggle('two', compare);
  el.viewerYouCard.hidden = !compare;
  el.viewerRefNo.textContent = compare ? 'Real SASL' : 'Fig. 1';
  el.viewerRefCap.textContent = compare ? `${head}, drawn from the Real SASL clip` : 'Drawn from the Real SASL clip';
  el.viewerRef.setAttribute('aria-label', `A drawn signer performing ${label} in SASL, from the Real SASL clip`);
  if (compare) {
    el.viewerYouCap.textContent = attemptCaption(attempt);
    el.viewerYou.setAttribute('aria-label', `${attemptCaption(attempt)}, drawn from your recording`);
  }
  const many = compare && choices?.length > 1;
  el.viewerChoices.hidden = !many;
  el.viewerChoices.innerHTML = many
    ? `<span class="j-caps" id="viewer-choices-label">Compare with</span>
       <span class="choice-row" role="group" aria-labelledby="viewer-choices-label">${choices.map((c) => `
         <button class="choice" type="button" data-choice="${escapeHtml(c)}" aria-pressed="${c === label}">${escapeHtml(splitLabel(c).head)}</button>`).join('')}</span>`
    : '';
  el.viewerExplain.textContent = compare
    ? 'Your try is stretched or squeezed to the length of the reference, so the two move together. '
      + 'Both are drawn as someone facing you would see them. Only your last try is kept, in this tab, until you record again.'
    : 'An illustration of the tracked movement, not the video: learn the sign from the Deaf signer on Real SASL.';
  const url = realSaslUrl(label);
  el.viewerSrc.hidden = !url;
  if (url) el.viewerSrc.href = url;
  renderViewerLesson(label, compare);
  syncPlayer(el.viewerPlayer, null);
  updateViewerTime(0, 0, 0);
  el.viewerFigs.classList.add('waiting');
  figureStatus(el.viewerRefStatus, 'Drawing the signer…');
  figureStatus(el.viewerYouStatus, compare ? 'Drawing your try…' : '');
  if (!el.viewer.open) el.viewer.showModal();

  let clip = null;
  try {
    clip = await referenceClip(label, variant);
  } catch {
    if (token === state.watch.viewerToken) {
      figureStatus(el.viewerRefStatus, 'The drawing did not load. The Real SASL video still works.');
      figureStatus(el.viewerYouStatus, '');
    }
    return;
  }
  if (token !== state.watch.viewerToken || !el.viewer.open) return;
  if (!clip) {
    figureStatus(el.viewerRefStatus, 'No drawing of this sign yet. Watch it on Real SASL.');
    figureStatus(el.viewerYouStatus, '');
    return;
  }
  const variantSelect = $('#viewer-variant');
  variantSelect.replaceChildren(...clip.variants.map((v, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Variant ${i + 1} of ${clip.variants.length} · ${v.source}`;
    option.selected = i === variant;
    return option;
  }));
  $('#viewer-variant-label').hidden = clip.variants.length < 2;
  variantSelect.onchange = () => openViewer({ ...state.watch.open, variant: Number(variantSelect.value) });
  el.viewerRefNo.textContent = clip.source;
  el.viewerRefCap.textContent = `Drawn from the ${clip.source} clip`;
  el.viewerRef.setAttribute('aria-label', `A drawn signer performing ${label} in SASL, from the ${clip.source} clip`);
  el.viewerSrc.hidden = !clip.url;
  if (clip.url) {
    el.viewerSrc.href = clip.url;
    el.viewerSrc.textContent = `Watch this variant on ${clip.source} ↗`;
  }
  el.viewerFigs.classList.remove('waiting');
  figureStatus(el.viewerRefStatus, '');
  figureStatus(el.viewerYouStatus, '');
  const stage = createStage(compare ? [el.viewerRef, el.viewerYou] : [el.viewerRef],
    compare ? [clip, attempt.clip] : [clip], {
      mirror: [state.watch.mirror, false],
      onTime: updateViewerTime,
      onState: () => syncPlayer(el.viewerPlayer, stage),
    });
  stage.setSpeed(state.watch.speed);
  state.watch.viewer = stage;
  syncPlayer(el.viewerPlayer, stage);
  if (at != null || reduceMotion?.matches) stage.seek(at ?? STILL_AT);
  else stage.play();
}

function stopViewerStage() {
  state.watch.viewer?.destroy();
  state.watch.viewer = null;
}

function updateViewerTime(p, seconds, duration) {
  const seek = el.viewerPlayer.querySelector('[data-act="seek"]');
  if (!seek.matches(':active')) seek.value = String(Math.round(p * 1000));
  seek.setAttribute('aria-valuetext', `${Math.round(p * 100)}% through the sign`);
  el.viewerPlayer.querySelector('[data-time]').textContent = duration
    ? `${seconds.toFixed(1)} / ${duration.toFixed(1)} s`
    : '';
}

function renderViewerLesson(label, compare) {
  const inLesson = lessonSet().has(label);
  el.viewerLesson.hidden = compare;
  el.viewerLesson.disabled = inLesson;
  el.viewerLesson.innerHTML = inLesson ? `${icon('check')}In your lesson` : `${icon('plus')}Add to your lesson`;
}

el.viewer.addEventListener('close', () => {
  state.watch.viewerToken += 1;
  stopViewerStage();
  state.watch.open = null;
});
el.viewerChoices.addEventListener('click', (e) => {
  const choice = e.target.closest('[data-choice]')?.dataset.choice;
  const open = state.watch.open;
  if (choice && open && choice !== open.label) {
    openViewer({ label: choice, attempt: open.attempt, choices: open.choices });
  }
});
el.viewerLesson.addEventListener('click', () => {
  const open = state.watch.open;
  if (!open) return;
  addToLesson(open.label);
  renderViewerLesson(open.label, false);
});
// A click on the backdrop, or on a close button, puts the sheet away.
for (const dialog of [el.viewer, el.loupe]) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
}

// --- Day and night journal -------------------------------------------------------

const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : Boolean(darkQuery?.matches);
}
// One stable name, "Night journal", pressed or not: what is said is what is
// shown, so a voice command for the visible words finds it.
function renderThemeToggle() {
  el.themeToggle.setAttribute('aria-pressed', String(isDark()));
}
el.themeToggle.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* the choice lasts for this visit */ }
  renderThemeToggle();
});
darkQuery?.addEventListener?.('change', renderThemeToggle);
renderThemeToggle();

// --- Utilities -----------------------------------------------------------------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/** "APPLE (1ST VARIANT)" -> { head: "APPLE", note: "1st variant" }. */
function splitLabel(label) {
  const m = /^([^(]+?)\s*\((.*)$/.exec(label);
  if (!m) return { head: label, note: '' };
  const note = m[2].replace(/\)\s*\(/g, '; ').replace(/[()]/g, '').trim().toLowerCase();
  return { head: m[1].trim(), note };
}

/** A sign's name for the big quiz word: the gloss, and any qualifier beneath it. */
function glossHtml(label) {
  const { head, note } = splitLabel(label);
  return `<span class="gloss">${escapeHtml(head)}</span>${note ? `<span class="gloss-note">${escapeHtml(note)}</span>` : ''}`;
}

// What src/demo.js may drive: the same render functions the camera path uses.
const demoApi = {
  state, el, setTab, setSignMode, setSpellMode, setStep, setBadge, setDial,
  pickLesson, renderLesson, renderQuiz, showQuizVerdict, showGuess, showPhrase,
  newSpellWord, renderSpellWord, showReading, renderDictionary,
  renderQuizFigure, openViewer, openLoupe, compareLastTry, markPlate, renderLessonChips, renderQuizProgress,
  renderTranscript, decode,
};

boot();

// The offline cache (sw.js): models are downloaded once, and the app opens with
// no connection. Not in development, where it would serve yesterday's code.
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline cache unavailable:', err));
}
