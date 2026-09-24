// Running the pretrained sign encoders in the browser.
//
// Two families, because together they beat either alone (measured on the
// RealSASL corpus, tools/compare-encoders.py):
//
//   OpenHands SL-GCN, three of them (American, Argentinian, Greek), on 27 body
//   and hand points. Small and fast.
//
//   SignCLIP, two fine-tunes on 203 points including the face: ASL Citizen
//   (52 signers, 2,731 signs) and the "asl_finetune" checkpoint (asl3). Each
//   is the stronger family across the whole dictionary, and the two disagree
//   usefully: adding asl3 raised a 10-word lesson from 83% to 86% on NID
//   signers the models had never seen (tools/bench-nid.py).
//
// None of them has seen SASL. What they learned is how to describe a sign
// while discarding who is making it, which is the part that matters here.
//
// The input builders (openhandsInput, signclipInput) and runOpenHands /
// runSignCLIP are exported so tools/embed-gallery.mjs makes the reference
// embeddings through this very code, not a copy of it.

import { toTensor } from './keypoints.js';
import { wantsExtraViews } from './device.js';
import { normaliseClip, resample, FRAME_DIM } from './holistic.js';

const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.mjs';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

const OPENHANDS = [
  'models/onnx/wlasl_slgcn.onnx',
  'models/onnx/lsa64_slgcn.onnx',
  'models/onnx/gsl_slgcn.onnx',
];
// Loaded in this order; the first is required, the others are extra views
// the ranking fuses when they load (src/reference.js).
export const SIGNCLIP = {
  citizen: 'models/onnx/signclip.onnx',
  asl3: 'models/onnx/signclip-asl3.onnx',
};

// Both reference sets were extracted at their clips' own rate: 885 clips at 30
// frames a second, 771 at 25. (ingest.py's SAMPLE_HZ = 20 looks like 20 fps, but
// its frame stride rounds to 1 for 25 and 29.97 fps video.) Attempts are
// resampled to the middle of that range so a sign keeps its reference speed.
const REFERENCE_FPS = 27;

let ready = null;

/** Load onnxruntime and every encoder once; repeat calls share the promise. */
export function loadEncoders(onProgress = () => {}) {
  if (ready) return ready;

  ready = (async () => {
    onProgress('Loading the sign models');
    const ort = await import(/* @vite-ignore */ ORT_URL);
    ort.env.wasm.wasmPaths = WASM_BASE;
    // Single-threaded: cross-origin isolation is not set up here, so the
    // threaded build would fall back anyway, noisily.
    ort.env.wasm.numThreads = 1;
    const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };

    // The first SignCLIP is required; the others are extra views that load
    // after the app is ready and join the ranking when they arrive, and phones
    // skip them (src/device.js).
    const [first, ...extra] = Object.keys(SIGNCLIP);
    const total = OPENHANDS.length + 1;
    const openhands = [];
    for (let i = 0; i < OPENHANDS.length; i++) {
      onProgress(`Loading the sign models (${i + 1} of ${total})`);
      openhands.push(await ort.InferenceSession.create(OPENHANDS[i], options));
    }
    onProgress(`Loading the sign models (${total} of ${total}, 87 MB)`);
    const signclip = { [first]: await ort.InferenceSession.create(SIGNCLIP[first], options) };
    if (wantsExtraViews()) {
      (async () => {
        for (const name of extra) {
          try {
            signclip[name] = await ort.InferenceSession.create(SIGNCLIP[name], options);
          } catch (err) {
            console.warn(`SignCLIP ${name} not loaded:`, err);   // an extra view that fails is left out
          }
        }
      })();
    }
    return { ort, openhands, signclip };
  })();

  ready.catch(() => { ready = null; }); // let a failed load be retried
  return ready;
}

export function unit(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const n = Math.sqrt(sum) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / n;
  return out;
}

/** Unit blocks -> one unit vector, so a comparison is a plain dot product. */
export function joinUnit(blocks) {
  const joined = new Float32Array(blocks.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const b of blocks) {
    joined.set(unit(b), at);
    at += b.length;
  }
  return unit(joined);
}

/**
 * 27-point frames -> the OpenHands input tensor. With capture `times` the
 * frames are first brought to the references' rate; references themselves
 * are passed without times, at their source rate.
 */
export function openhandsInput(frames, times) {
  const steady = times ? resample(frames, times, REFERENCE_FPS, 128) : frames;
  return toTensor(steady);
}

/** 203-point frames -> the SignCLIP input tensor, likewise. */
export function signclipInput(frames, times) {
  const steady = times ? resample(frames, times, REFERENCE_FPS, 256) : frames;
  return { data: normaliseClip(steady), dims: [1, steady.length, FRAME_DIM] };
}

/**
 * The OpenHands ensemble embedding (768, unit length): each encoder's block is
 * normalised before concatenation, then the whole vector again.
 */
export async function runOpenHands(ort, sessions, frames, times) {
  const { data, dims } = openhandsInput(frames, times);
  const input = new ort.Tensor('float32', data, dims);
  const blocks = [];
  for (const session of sessions) {
    const out = await session.run({ keypoints: input });
    blocks.push(out.embedding.data);
  }
  return joinUnit(blocks);
}

/** One SignCLIP checkpoint's embedding (768, unit length). */
export async function runSignCLIP(ort, session, frames, times) {
  const { data, dims } = signclipInput(frames, times);
  const out = await session.run({ frames: new ort.Tensor('float32', data, dims) });
  return unit(out.embedding.data);
}

/** 27-point frames -> the OpenHands ensemble embedding (768, unit length). */
export async function embedOpenHands(frames, times) {
  if (!frames?.length) return null;
  const { ort, openhands } = await loadEncoders();
  return runOpenHands(ort, openhands, frames, times);
}

/**
 * 203-point frames -> the ASL Citizen SignCLIP embedding (768, unit length),
 * carrying every other loaded checkpoint's embedding as a property of the same
 * name (`.asl3`), so rankSigns({ openhands, signclip }) fuses them all without
 * its callers changing.
 */
export async function embedSignCLIP(frames, times) {
  if (!frames?.length) return null;
  const { ort, signclip } = await loadEncoders();
  const [first, ...rest] = Object.keys(signclip);
  const main = await runSignCLIP(ort, signclip[first], frames, times);
  for (const name of rest) main[name] = await runSignCLIP(ort, signclip[name], frames, times);
  return main;
}
