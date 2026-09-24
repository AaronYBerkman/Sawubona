// The sentence builder page: paste English, see the SASL order and why,
// watch it signed, then sign it yourself.
//
//   const view = mountSentenceBuilder(el, {
//     labels,                        // dictionary sign labels
//     replay: { load, create },      // optional: loadReplay() and createReplay from src/figure.js
//     onPractise(plan, sentence) {}, // optional: the app records the learner and calls
//                                    //   view.showAttempt(alignAttempt(plan, pieces), sentence)
//   });
//
// Everything is drawn from src/grammar.js; this file only lays it out.

import { buildParagraph, glossLine, makeLexicon, RULES } from './grammar.js';

const ROLE = {
  time: { name: 'Time', ask: 'When?' },
  place: { name: 'Place', ask: 'Where?' },
  subject: { name: 'Subject', ask: 'Who?' },
  object: { name: 'Object', ask: 'What?' },
  describe: { name: 'Describes', ask: 'Like what?' },
  whose: { name: 'Whose', ask: 'Belongs to' },
  verb: { name: 'Verb', ask: 'What action?' },
  neg: { name: 'Not', ask: 'Head shake' },
  question: { name: 'Question', ask: 'Asking' },
  greeting: { name: 'Greeting', ask: '' },
  link: { name: 'Joins', ask: '' },
  other: { name: 'Other', ask: 'English order' },
};

// face-and-body rules first: they are the part a word list cannot show
const FACE = ['neg', 'negSign', 'wh', 'yn', 'condition', 'because'];
const SKIP_NOTES = new Set(['missing', 'kept', 'dummy']);

const EXAMPLE = 'Yesterday I went to the shop. I bought bread and milk. Tomorrow my friend Thabo will come to my house. Where do you live? I don\'t like fish.';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = 'j-icon') => `<svg class="${cls}" aria-hidden="true"><use href="assets/art/icons.svg#${id}"/></svg>`;

// a pencil arrow between two cards; a little different each time
function arrowSvg(k) {
  const wob = [[-1.5, 1], [1, -1.2], [0.6, 1.4], [-1, -0.6]][k % 4];
  return `<svg class="sb-arrow" viewBox="0 0 48 20" aria-hidden="true"><path d="M3 ${10 + wob[0]} C 16 ${8 + wob[1]}, 30 ${12 + wob[0]}, 42 10" /><path d="M35 4.5 L43 10 L35.5 15.5" /></svg>`;
}

function roleLabel(s) {
  if (s.kind === 'possess') return ROLE.whose;
  const r = s.kind === 'describe' && s.role !== 'describe' ? ROLE.describe : ROLE[s.role] || ROLE.other;
  return r;
}

/** One short pencil note to hang over the most instructive card. */
function annotation(sentence) {
  const S = sentence.signs;
  const at = (pred) => S.findIndex(pred);
  const picks = [
    [at((s) => s.role === 'question' && s.rule === 'wh'), 'question word goes last'],
    [at((s) => s.added), 'added: sets the tense'],
    [at((s) => s.role === 'time'), 'time goes first'],
    [at((s) => s.role === 'place' && s.rule === 'place'), 'the place sets the scene'],
    [at((s) => s.rule === 'because'), 'because → a question'],
    [at((s) => s.rule === 'adj'), 'describe it after'],
    [at((s) => s.role === 'neg'), 'after the verb'],
    [at((s) => s.rule === 'directional'), 'the verb moves'],
    [S.length > 1 ? at((s) => s.role === 'verb' && !s.kind?.startsWith('describe')) : -1, 'action goes here'],
  ];
  const hit = picks.find(([i]) => i >= 0);
  return hit ? { index: hit[0], text: hit[1] } : null;
}

function fingerHands(word) {
  const letters = word.replace(/[^A-Z ]/g, '').split('');
  return letters.map((L) => (L === ' '
    ? '<span class="sb-hand-gap"></span>'
    : `<span class="sb-hand"><img src="assets/hands/ink/${L}.svg" alt="" loading="lazy" onerror="this.remove()"><b>${L}</b></span>`)).join('');
}

function cardHtml(s, i, sentence, note) {
  const r = roleLabel(s);
  const state = s.state;
  const glossText = s.state === 'spell' ? s.spell.split(' ').map((w) => w.split('').join('-')).join(' ') : s.gloss;
  const badge = state === 'missing' ? '<span class="sb-badge">no clip yet</span>'
    : state === 'spell' ? '<span class="sb-badge">fingerspell</span>'
      : s.point ? '<span class="sb-badge">point</span>'
        : s.variants > 1 ? `<span class="sb-badge">${s.variants} ways</span>` : '';
  const sub = s.sub ? `<span class="sb-sub">${esc(s.sub)}</span>` : '';
  const rule = s.rule && RULES[s.rule] ? ` data-rule="${s.rule}"` : '';
  return `<li class="sb-item" data-i="${i}">
    ${note ? `<span class="sb-note">${esc(note)}<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M52 3 C 50 18, 40 30, 18 34" /><path d="M24 28 L17 34.5 L25 38.5" /></svg></span>` : ''}
    <button type="button" class="sb-card" data-role="${s.role}" data-kind="${s.kind}" data-state="${state}"${s.added ? ' data-added' : ''}${rule}
      aria-label="${esc(`${s.gloss}. ${r.name}${s.sub ? `, ${s.sub}` : ''}`)}">
      <span class="sb-gloss${glossText.length > 11 ? ' sb-gloss--long' : ''}">${esc(glossText)}</span>
      ${badge}
    </button>
    <span class="sb-role">${esc(r.name)}</span>
    ${r.ask ? `<span class="sb-ask">${esc(r.ask)}</span>` : ''}
    ${sub}
  </li>`;
}

function marksHtml(sentence) {
  // one lane per mark, drawn as a pencil bracket over the signs it covers
  return sentence.marks.map((m, lane) => {
    const n = sentence.signs.length;
    const from = Math.max(0, m.from); const to = Math.min(n - 1, m.to);
    return `<div class="sb-mark" data-kind="${m.kind}" style="--from:${from};--to:${to};--lane:${lane}">
      <span class="sb-mark-label">${esc(m.label)}</span></div>`;
  }).join('');
}

function englishHtml(sentence) {
  let prev = 0;
  let html = '';
  for (const w of sentence.words) {
    html += esc(sentence.text.slice(prev, w.start));
    prev = w.end;
    if (w.punct) { html += esc(w.text); continue; }
    if (w.sign !== undefined && w.sign >= 0) {
      const s = sentence.signs[w.sign];
      html += `<span class="sb-word" data-sign="${w.sign}" data-role="${s.role}">${esc(w.text)}<sup>${w.sign + 1}</sup></span>`;
    } else {
      const why = RULES[w.drop];
      html += `<span class="sb-word sb-word--dropped" tabindex="0" data-why="${esc(w.drop)}" title="${esc(why ? why.title : 'not signed')}">${esc(w.text)}</span>`;
    }
  }
  return html + esc(sentence.text.slice(prev));
}

function droppedHtml(sentence) {
  const by = new Map();
  for (const w of sentence.words) {
    if (!w.drop || w.punct) continue;
    if (!by.has(w.drop)) by.set(w.drop, []);
    by.get(w.drop).push(w.text);
  }
  if (!by.size) return '';
  return `<ul class="sb-dropped">${[...by].map(([why, ws]) => `<li><s>${ws.map(esc).join(', ')}</s> ${esc(RULES[why]?.title || 'not signed')}</li>`).join('')}</ul>`;
}

function rulesHtml(sentence) {
  const ids = sentence.rules.filter((r) => !SKIP_NOTES.has(r));
  const face = ids.filter((r) => FACE.includes(r));
  const order = ids.filter((r) => !FACE.includes(r));
  const one = (id, k) => {
    const r = RULES[id];
    return `<li class="sb-rule" data-rule="${id}"><span class="sb-rule-n">${k}</span>
      <div><h4>${esc(r.title)} <span class="sb-strength" data-s="${r.strength}">${esc(r.strength)}</span></h4>
      <p>${esc(r.text)}</p>${r.source ? `<p class="sb-source">${esc(r.source)}</p>` : ''}</div></li>`;
  };
  let k = 0;
  return `${face.length ? `<h3 class="sb-rules-h">Your face does grammar too</h3><ol class="sb-rules">${face.map((id) => one(id, ++k)).join('')}</ol>` : ''}
    ${order.length ? `<h3 class="sb-rules-h">Why this order</h3><ol class="sb-rules">${order.map((id) => one(id, ++k)).join('')}</ol>` : ''}`;
}

export function mountSentenceBuilder(root, { labels, replay = null, onPractise = null, initial = EXAMPLE, heading = true } = {}) {
  const lex = makeLexicon(labels);
  let sentences = [];
  let current = 0;
  let player = null;
  let playToken = 0;

  root.classList.add('sb');
  root.innerHTML = `
    <header class="sb-head"${heading ? '' : ' hidden'}>
      <h2 class="sb-title">Find the shape of your <span class="sb-underline">sentence.</span></h2>
      <p class="sb-lede">Paste a sentence or a paragraph. See the order SASL puts it in, and why. Then practise it one sentence at a time.</p>
    </header>

    <div class="sb-top">
      <section class="sb-panel sb-input j-lined" aria-labelledby="sb-h1">
        <h3 class="sb-h" id="sb-h1"><span class="sb-num">1.</span> Your paragraph</h3>
        <div class="sb-editor">
          <div class="sb-backdrop" aria-hidden="true"></div>
          <textarea class="sb-text" rows="4" spellcheck="true" aria-label="Your English sentence or paragraph"></textarea>
        </div>
        <div class="sb-actions">
          <button type="button" class="j-btn sb-build">${icon('page')} Build my sentences</button>
          <span class="sb-count j-type" aria-live="polite"></span>
        </div>
      </section>

      <aside class="sb-panel sb-list-card" aria-labelledby="sb-h-list">
        <span class="j-tape sb-tape" style="--tilt:-3deg"></span>
        <h3 class="sb-h" id="sb-h-list">Your sentences</h3>
        <ol class="sb-list"></ol>
        <p class="sb-where j-type"></p>
      </aside>
    </div>

    <section class="sb-panel sb-order" aria-labelledby="sb-h2">
      <div class="sb-order-head">
        <h3 class="sb-h" id="sb-h2"><span class="sb-num">2.</span> Suggested sign order</h3>
        <span class="sb-pill sb-kind"></span>
        <span class="sb-pill sb-rough" hidden>rough guide: a long or complex sentence</span>
      </div>
      <div class="sb-strip-wrap">
        <div class="sb-marks"></div>
        <ol class="sb-strip" aria-label="Signs in order"></ol>
      </div>
      <p class="sb-alt j-type" hidden></p>
      <div class="sb-english-row">
        <p class="sb-english-label j-caps">From your English</p>
        <p class="sb-english"></p>
        <div class="sb-dropped-wrap"></div>
      </div>
      <p class="sb-foot j-hint">${icon('info')}<span>English labels for signs, in SASL order: a guide to the order, not a full translation. SASL also uses space, the face and the movement itself.</span></p>
    </section>

    <div class="sb-bottom">
      <section class="sb-panel sb-practise" aria-labelledby="sb-h3">
        <h3 class="sb-h" id="sb-h3"><span class="sb-num">3.</span> Practise this sequence</h3>
        <div class="sb-practise-grid">
          <figure class="sb-figure j-photo j-corners" style="--tilt:-.8deg">
            <canvas class="sb-canvas" aria-label="An ink figure signing the sentence"></canvas>
            <figcaption class="sb-now j-type">Press Watch</figcaption>
            <div class="sb-spell-show" hidden></div>
          </figure>
          <div class="sb-practise-main">
            <p class="sb-sequence" aria-live="polite"></p>
            <div class="sb-buttons">
              <button type="button" class="sb-btn sb-watch">${icon('play')} Watch signed example</button>
              <button type="button" class="sb-btn sb-slow" aria-pressed="false">${icon('slow')} Slower</button>
              <button type="button" class="sb-btn sb-mine">${icon('camera')} Sign it yourself</button>
            </div>
            <p class="sb-practise-note j-hint">${icon('info')}<span></span></p>
            <div class="sb-attempt" hidden></div>
          </div>
        </div>
      </section>

      <aside class="sb-panel sb-notes j-scrap j-green" style="--tilt:.4deg" aria-labelledby="sb-h4">
        <h3 class="sb-h" id="sb-h4">More than word order</h3>
        <div class="sb-rules-wrap"></div>
        <img class="sb-sprig j-art--ink" src="assets/art/sprig.svg" alt="" />
      </aside>
    </div>
    <nav class="sb-next-row">
      <button type="button" class="sb-link sb-prev">${icon('back')} Previous sentence</button>
      <button type="button" class="sb-link sb-next">Next sentence ${icon('arrow')}</button>
    </nav>
    <p class="sb-credit j-caps">A learner's guide built from Real SASL's lessons and SASL research · signers vary · check with a Deaf teacher</p>`;

  const $ = (sel) => root.querySelector(sel);
  const text = $('.sb-text');
  const backdrop = $('.sb-backdrop');
  text.value = initial;

  function syncBackdrop() {
    const s = sentences[current];
    const v = text.value;
    if (!s || s.end > v.length) { backdrop.innerHTML = esc(v) + '\n'; return; }
    backdrop.innerHTML = `${esc(v.slice(0, s.start))}<mark>${esc(v.slice(s.start, s.end))}</mark>${esc(v.slice(s.end))}\n`;
    backdrop.scrollTop = text.scrollTop;
  }

  function build() {
    stopPlaying();
    sentences = buildParagraph(text.value, lex);
    if (current >= sentences.length) current = 0;
    $('.sb-count').textContent = sentences.length ? `${sentences.length} sentence${sentences.length === 1 ? '' : 's'}` : '';
    renderList();
    renderSentence();
  }

  function renderList() {
    $('.sb-list').innerHTML = sentences.map((s, i) => `<li><button type="button" class="sb-li${i === current ? ' is-current' : ''}" data-i="${i}" aria-current="${i === current}">
      <span class="sb-li-n">${i + 1}</span><span class="sb-li-t">${esc(s.text)}</span></button></li>`).join('')
      || '<li class="sb-empty">Write or paste some English on the left.</li>';
    $('.sb-where').textContent = sentences.length ? `Sentence ${current + 1} of ${sentences.length}` : '';
    $('.sb-prev').disabled = current <= 0;
    $('.sb-next').disabled = current >= sentences.length - 1;
  }

  function renderSentence() {
    syncBackdrop();
    const s = sentences[current];
    const strip = $('.sb-strip');
    $('.sb-attempt').hidden = true;
    if (!s) {
      strip.innerHTML = '';
      $('.sb-marks').innerHTML = '';
      $('.sb-english').textContent = '';
      $('.sb-sequence').textContent = '';
      $('.sb-rules-wrap').innerHTML = '';
      return;
    }
    const note = annotation(s);
    strip.innerHTML = s.signs.map((x, i) => (i ? `<li class="sb-join" aria-hidden="true">${arrowSvg(i)}</li>` : '') + cardHtml(x, i, s, note?.index === i ? note.text : null)).join('');
    strip.style.setProperty('--n', s.signs.length);
    $('.sb-marks').innerHTML = marksHtml(s);
    $('.sb-strip-wrap').style.setProperty('--lanes', s.marks.length);
    requestAnimationFrame(placeMarks);
    const kinds = { wh: 'Question: what, where, who…', yn: 'Yes / no question', command: 'Asking someone to do something', statement: 'Statement' };
    $('.sb-kind').textContent = kinds[s.kind] || 'Statement';
    $('.sb-rough').hidden = !s.rough;
    const alt = $('.sb-alt');
    if (s.alt) {
      alt.hidden = false;
      alt.innerHTML = `<span class="j-caps">Also common</span> ${s.alt.map((i) => esc(s.signs[i].gloss)).join(' ')} <span class="sb-alt-why">English-like order, also understood</span>`;
    } else alt.hidden = true;
    $('.sb-english').innerHTML = englishHtml(s);
    $('.sb-dropped-wrap').innerHTML = droppedHtml(s);
    $('.sb-sequence').innerHTML = s.signs.map((x, i) => `<span class="sb-seq" data-i="${i}" data-state="${x.state}">${esc(x.state === 'spell' ? x.spell.split(' ').map((w) => w.split('').join('-')).join(' ') : x.gloss)}</span>`)
      .join('<span class="sb-seq-arrow" aria-hidden="true">→</span>');
    const missing = s.signs.filter((x) => x.state === 'missing').map((x) => x.gloss);
    const spelled = s.signs.filter((x) => x.state === 'spell').map((x) => x.gloss);
    const bits = [];
    if (missing.length) bits.push(`No clip yet for ${missing.join(', ')}: the example shows the word for those, so look the sign up before you practise.`);
    if (spelled.length) bits.push(`${spelled.join(', ')}: fingerspell, or use the person's sign name.`);
    if (!bits.length) bits.push('Every sign here has a clip in the dictionary. Watch, then sign it yourself with a small pause between signs.');
    $('.sb-practise-note span').textContent = bits.join(' ');
    $('.sb-mine').disabled = !onPractise || !s.signs.some((x) => x.entry);
    $('.sb-watch').disabled = !replay;
    $('.sb-rules-wrap').innerHTML = rulesHtml(s) || '<p class="sb-empty">No reordering needed here.</p>';
    showAttempt();   // the learner's last try at this sentence, if there is one
    renderList();
    poseFirst(s);
  }

  // the figure waits in the first sign's opening pose
  async function poseFirst(s) {
    const first = s.signs.find((x) => x.entry);
    if (!replay || !first) return;
    const token = playToken;
    try {
      const R = await replay.load();
      await R.ready?.(first.entry);
      if (token !== playToken || sentences[current] !== s) return;
      const frames = R.clipFrames(first.entry);
      if (!frames?.length) return;
      if (!player) player = replay.create(canvas, frames, { fps: R.fps, loop: false });
      else player.load(frames, { fps: R.fps });
      player.seek(0);
      caption.textContent = `Press Watch: ${s.signs.length} sign${s.signs.length === 1 ? '' : 's'}`;
    } catch { /* the figure is optional */ }
  }

  // brackets for eyebrows / head shake: measured from the cards they cover,
  // one piece per line when the signs wrap
  function placeMarks() {
    const wrap = $('.sb-strip-wrap');
    const box = wrap.getBoundingClientRect();
    const cards = [...root.querySelectorAll('.sb-card')];
    const band = parseFloat(getComputedStyle(wrap).getPropertyValue('--band')) || 58;
    root.querySelectorAll('.sb-mark--more').forEach((m) => m.remove());
    root.querySelectorAll('.sb-mark').forEach((m) => {
      const from = Number(m.style.getPropertyValue('--from'));
      const to = Number(m.style.getPropertyValue('--to'));
      const lane = Number(m.style.getPropertyValue('--lane'));
      const rows = [];
      for (let i = from; i <= to; i++) {
        const r = cards[i]?.getBoundingClientRect();
        if (!r) continue;
        const row = rows.find((x) => Math.abs(x.top - r.top) < 8);
        if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); } else rows.push({ top: r.top, left: r.left, right: r.right });
      }
      rows.forEach((row, k) => {
        const el = k ? m.cloneNode(false) : m;
        if (k) { el.classList.add('sb-mark--more'); m.after(el); }
        el.style.left = `${row.left - box.left}px`;
        el.style.width = `${Math.max(24, row.right - row.left)}px`;
        el.style.top = `${row.top - box.top - band - lane * 26 + 6}px`;
      });
    });
  }

  // --- the signed example -------------------------------------------------

  const canvas = $('.sb-canvas');
  const caption = $('.sb-now');
  const spellShow = $('.sb-spell-show');
  let slow = false;

  function highlight(i) {
    root.querySelectorAll('.sb-seq, .sb-card').forEach((el) => el.classList.remove('is-now'));
    if (i < 0) return;
    root.querySelectorAll(`.sb-seq[data-i="${i}"]`).forEach((el) => el.classList.add('is-now'));
    root.querySelectorAll('.sb-card')[i]?.classList.add('is-now');
  }

  function stopPlaying() {
    playToken++;
    player?.pause();
    highlight(-1);
    spellShow.hidden = true;
    $('.sb-watch').innerHTML = `${icon('play')} Watch signed example`;
  }

  const wait = (ms, token) => new Promise((res) => setTimeout(() => res(token === playToken), ms));

  async function playSign(x, token) {
    if (x.entry && replay) {
      const R = await replay.load();
      await R.ready?.(x.entry);
      const frames = R.clipFrames(x.entry);
      if (frames?.length) {
        caption.textContent = x.gloss;
        spellShow.hidden = true;
        if (!player) player = replay.create(canvas, frames, { fps: R.fps, loop: false, speed: slow ? 0.6 : 1 });
        else player.load(frames, { fps: R.fps });
        player.setLoop(false);
        player.setSpeed(slow ? 0.6 : 1);
        player.seek(0);
        await new Promise((res) => {
          const secs = frames.length / R.fps / (slow ? 0.6 : 1);
          player.play();
          setTimeout(res, secs * 1000 + 250);
        });
        return token === playToken;
      }
    }
    if (x.state === 'spell') {
      spellShow.hidden = false;
      const letters = x.spell.replace(/ /g, '').split('');
      for (const L of letters) {
        spellShow.innerHTML = `<img src="assets/hands/ink/${L}.svg" alt="" onerror="this.remove()"><b>${L}</b>`;
        caption.textContent = `${x.spell} · ${L}`;
        if (!(await wait(slow ? 900 : 600, token))) return false;
      }
      spellShow.hidden = true;
      return true;
    }
    spellShow.hidden = false;
    spellShow.innerHTML = `<b class="sb-show-word">${esc(x.gloss)}</b><span>${x.point ? 'point' : x.number ? 'number' : 'no clip in this dictionary yet'}</span>`;
    caption.textContent = x.gloss;
    const ok = await wait(slow ? 1600 : 1100, token);
    spellShow.hidden = true;
    return ok;
  }

  async function watch() {
    const s = sentences[current];
    if (!s || !replay) return;
    if ($('.sb-watch').dataset.playing === '1') { $('.sb-watch').dataset.playing = '0'; stopPlaying(); return; }
    const token = ++playToken;
    $('.sb-watch').dataset.playing = '1';
    $('.sb-watch').innerHTML = `${icon('pause')} Stop`;
    for (let i = 0; i < s.signs.length; i++) {
      highlight(i);
      if (!(await playSign(s.signs[i], token))) return;
    }
    highlight(-1);
    caption.textContent = glossLine(s);
    $('.sb-watch').dataset.playing = '0';
    $('.sb-watch').innerHTML = `${icon('arrow-loop')} Watch again`;
  }

  // --- the learner's attempt ----------------------------------------------

  const STAMP = { seen: ['match', 'seen'], close: ['close', 'close'], missed: ['not', 'not seen'], unchecked: ['', 'not checked'] };
  // The learner's last try at each sentence, in memory: still there on coming
  // back to that sentence, and never shown on another one.
  const attempts = new Map();
  const attemptKey = (s) => `${s.text}\n${s.signs.map((x) => x.gloss).join(' ')}`;

  /** A try at `forSentence` (by default the one shown); with no result, redraw the one shown. */
  function showAttempt(result, forSentence = sentences[current]) {
    if (result && forSentence?.signs) {
      const k = attemptKey(forSentence);
      attempts.delete(k);
      attempts.set(k, result);
      if (attempts.size > 40) attempts.delete(attempts.keys().next().value);
    }
    const s = sentences[current];
    const box = $('.sb-attempt');
    const shown = s && attempts.get(attemptKey(s));
    if (!shown || shown.signs?.length !== s.signs.length) { box.hidden = true; return; }
    box.hidden = false;
    const rows = shown.signs.map((r, i) => {
      const [kind, word] = STAMP[r.status] ?? STAMP.unchecked;
      return `<li><span class="sb-att-gloss">${esc(r.text ?? r.gloss)}</span>
        ${kind ? `<span class="j-stamp j-stamp--${kind} j-stamp--in" style="--tilt:${(i % 3) - 4}deg">${esc(word)}</span>` : `<span class="sb-att-skip">${esc(r.note ?? word)}</span>`}
        ${r.status === 'close' && r.other ? `<span class="sb-att-heard">looked more like ${esc(r.other)}</span>` : ''}</li>`;
    }).join('');
    box.innerHTML = `<h4 class="j-caps">What the camera saw</h4><ol class="sb-att">${rows}</ol><p class="sb-att-sum">${esc(shown.summary ?? '')}</p>`;
    s.signs.forEach((x, i) => {
      const st = shown.signs[i]?.status;
      root.querySelectorAll(`.sb-seq[data-i="${i}"]`).forEach((el) => { el.dataset.result = st; });
    });
  }

  // --- events ---------------------------------------------------------------

  $('.sb-build').addEventListener('click', () => { current = 0; build(); });
  let typing = 0;
  text.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(build, 450); syncBackdrop(); });
  text.addEventListener('scroll', () => { backdrop.scrollTop = text.scrollTop; });
  $('.sb-list').addEventListener('click', (e) => {
    const b = e.target.closest('.sb-li');
    if (!b) return;
    stopPlaying();
    current = Number(b.dataset.i);
    renderSentence();
  });
  $('.sb-next').addEventListener('click', () => { if (current < sentences.length - 1) { stopPlaying(); current++; renderSentence(); } });
  $('.sb-prev').addEventListener('click', () => { if (current > 0) { stopPlaying(); current--; renderSentence(); } });
  $('.sb-watch').addEventListener('click', watch);
  $('.sb-slow').addEventListener('click', () => {
    slow = !slow;
    $('.sb-slow').setAttribute('aria-pressed', String(slow));
    player?.setSpeed(slow ? 0.6 : 1);
  });
  $('.sb-mine').addEventListener('click', () => {
    const s = sentences[current];
    if (!s || !onPractise) return;
    stopPlaying();
    onPractise(s.signs.map((x) => ({ gloss: x.gloss, entry: x.entry || null })), s);
  });
  // hovering a card lights its English words, and the other way round
  const link = (i, on) => {
    root.querySelectorAll(`.sb-word[data-sign="${i}"]`).forEach((el) => el.classList.toggle('is-linked', on));
    root.querySelectorAll('.sb-card')[i]?.classList.toggle('is-linked', on);
  };
  root.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.sb-item, .sb-word[data-sign]');
    if (!c) return;
    link(c.dataset.i ?? c.dataset.sign, true);
  });
  root.addEventListener('pointerout', (e) => {
    const c = e.target.closest('.sb-item, .sb-word[data-sign]');
    if (!c) return;
    link(c.dataset.i ?? c.dataset.sign, false);
  });
  root.addEventListener('click', (e) => {
    const card = e.target.closest('.sb-card[data-rule]');
    if (!card) return;
    const rule = root.querySelector(`.sb-rule[data-rule="${card.dataset.rule}"]`);
    if (!rule) return;
    rule.classList.remove('is-flash');
    void rule.offsetWidth;
    rule.classList.add('is-flash');
    rule.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  new ResizeObserver(() => placeMarks()).observe($('.sb-strip-wrap'));

  build();
  return {
    setText(t) { text.value = t; current = 0; build(); },
    showAttempt,
    current: () => sentences[current],
    stop: stopPlaying,
  };
}
