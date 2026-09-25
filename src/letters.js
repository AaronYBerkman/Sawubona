// Reading SASL letters from one hand, with the learned classifier.
//
// Browser twin of tools/letters.py: features() here must match features() there
// exactly, and npm test checks both against a fixture of real frames.
//
// The model was trained on five SASL presenters from alphabet videos, every
// hold checked by eye, plus ten signers from ASL-HG for the letters the two
// alphabets share (ASL's T is not SASL's, so ASL-HG gives no T). Tested on a
// presenter it has not seen, it reads 96% of held letters correctly.
//
// J and Z are movements, not shapes, so they are not letters this reads.

let model = null;

function floats(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** Parse the exported model JSON (data/letter-model.json). */
export function setLetterModel(json) {
  model = {
    letters: json.letters,
    mean: floats(json.mean),
    std: floats(json.std),
    layers: json.layers.map((l) => ({
      in: l.in, out: l.out, weight: floats(l.weight), bias: floats(l.bias),
    })),
  };
  return model;
}

export async function loadLetterModel(url = 'data/letter-model.json') {
  if (model) return model;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`letter model: ${res.status}`);
  return setLetterModel(await res.json());
}

export function letterNames() {
  return model?.letters ?? [];
}

/**
 * 21 image landmarks + 21 world landmarks -> 126 numbers.
 *
 * Both sets are centred on the wrist and scaled by wrist-to-middle-knuckle
 * length (2D for the image points, 3D for world). Image x and z are multiplied
 * by the frame aspect so image points are isotropic. Orientation is kept:
 * G/H and P/Q differ from their neighbours mostly in where they point.
 */
export function letterFeatures(img, world, aspect) {
  const out = new Float32Array(126);
  const ix = (i) => img[i].x * aspect;
  const iy = (i) => img[i].y;
  const iz = (i) => img[i].z * aspect;
  const s2 = Math.hypot(ix(9) - ix(0), iy(9) - iy(0)) || 1e-6;
  for (let i = 0; i < 21; i++) {
    out[i * 3] = (ix(i) - ix(0)) / s2;
    out[i * 3 + 1] = (iy(i) - iy(0)) / s2;
    out[i * 3 + 2] = (iz(i) - iz(0)) / s2;
  }
  const w0 = world[0];
  const s3 = Math.hypot(world[9].x - w0.x, world[9].y - w0.y, world[9].z - w0.z) || 1e-6;
  for (let i = 0; i < 21; i++) {
    out[63 + i * 3] = (world[i].x - w0.x) / s3;
    out[63 + i * 3 + 1] = (world[i].y - w0.y) / s3;
    out[63 + i * 3 + 2] = (world[i].z - w0.z) / s3;
  }
  return out;
}

/** 126 features -> log-probability per letter. */
export function letterLogProbs(features) {
  if (!model) throw new Error('letter model not loaded');
  let x = new Float32Array(features.length);
  for (let i = 0; i < x.length; i++) x[i] = (features[i] - model.mean[i]) / model.std[i];
  model.layers.forEach((layer, k) => {
    const y = new Float32Array(layer.out);
    for (let o = 0; o < layer.out; o++) {
      let sum = layer.bias[o];
      const row = o * layer.in;
      for (let i = 0; i < layer.in; i++) sum += layer.weight[row + i] * x[i];
      y[o] = k < model.layers.length - 1 && sum < 0 ? 0 : sum;   // ReLU between layers
    }
    x = y;
  });
  let max = -Infinity;
  for (const v of x) if (v > max) max = v;
  let total = 0;
  for (const v of x) total += Math.exp(v - max);
  const lse = max + Math.log(total);
  return x.map((v) => v - lse);
}

/**
 * The spelling hand: the highest wrist in frame.
 *
 * Presenters and learners rest the other hand in view, and it is detected just
 * as confidently; the spelling hand is the raised one.
 */
export function spellingHand(handResult) {
  const hands = handResult?.landmarks ?? [];
  if (!hands.length) return null;
  let best = 0;
  for (let i = 1; i < hands.length; i++) if (hands[i][0].y < hands[best][0].y) best = i;
  const world = handResult.worldLandmarks?.[best];
  return world ? { img: hands[best], world } : null;
}

/**
 * Letter readings smoothed over the last few frames.
 *
 * A single frame is noisy, and a letter is a held shape, so the reading is the
 * mean log-probability over a short window - the same pooling the evaluation
 * used over a hold.
 */
export function createLetterReader({ window = 6 } = {}) {
  const recent = [];
  return {
    push(logp) {
      recent.push(logp);
      if (recent.length > window) recent.shift();
    },
    clear() {
      recent.length = 0;
    },
    read() {
      if (!recent.length || !model) return null;
      const n = model.letters.length;
      const mean = new Float32Array(n);
      for (const lp of recent) for (let i = 0; i < n; i++) mean[i] += lp[i] / recent.length;
      const ranked = [...mean].map((v, i) => ({ letter: model.letters[i], p: Math.exp(v) }))
        .sort((a, b) => b.p - a.p);
      const total = ranked.reduce((s, r) => s + r.p, 0);
      for (const r of ranked) r.p /= total;
      return { best: ranked[0], alternatives: ranked.slice(1, 3), frames: recent.length };
    },
  };
}
