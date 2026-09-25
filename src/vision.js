// Camera + MediaPipe landmark tracking.
//
// Hands and body run on every tracked frame. The face runs only while a sign is
// recorded: SignCLIP reads 128 face-contour points, and nothing else needs it.
// Face setup is exposed lazily so the camera preview does not wait for a third
// model before it can open.
// Models are fetched from Google's CDN the first time and then served from the
// browser cache, so the first load needs a network connection and later ones
// do not.

import { HAND_CONNECTIONS } from './hand-topology.js';
import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export { HAND_CONNECTIONS } from './hand-topology.js';

export async function createTrackers(onProgress = () => {}) {
  onProgress('Loading vision runtime');
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);

  onProgress('Loading hand model');
  const hands = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.4,
    minHandPresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });

  onProgress('Loading pose model');
  const pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });

  let faceReady = null;
  const loadFace = () => {
    if (!faceReady) {
      onProgress('Loading face model');
      faceReady = FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      }).catch((err) => { faceReady = null; throw err; });
    }
    return faceReady;
  };

  return { hands, pose, face: null, loadFace };
}

export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

/** Draw the tracked skeleton over the live image so framing problems are obvious. */
export function drawOverlay(ctx, width, height, handResult, frameOk) {
  ctx.clearRect(0, 0, width, height);
  const hands = handResult?.landmarks ?? [];

  for (const lms of hands) {
    ctx.strokeStyle = frameOk ? 'rgba(120, 220, 190, 0.85)' : 'rgba(240, 180, 120, 0.85)';
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(lms[a].x * width, lms[a].y * height);
      ctx.lineTo(lms[b].x * width, lms[b].y * height);
      ctx.stroke();
    }
    ctx.fillStyle = frameOk ? 'rgba(180, 250, 225, 0.95)' : 'rgba(250, 210, 160, 0.95)';
    for (const lm of lms) {
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Monotonic timestamp source shared by the live loop and by video import.
 *
 * MediaPipe throws if a VIDEO-mode timestamp is not greater than the last one it
 * saw, and importing a file interleaves detections with the camera loop. One
 * clock for both keeps them from tripping over each other.
 */
export function createClock() {
  let last = -1;
  return () => {
    const now = Math.max(performance.now(), last + 1);
    last = now;
    return now;
  };
}

/** Release the camera. The indicator light going out is the point. */
export function stopCamera(video, stream) {
  for (const track of stream?.getTracks() ?? []) track.stop();
  if (video) {
    video.srcObject = null;
    video.removeAttribute('src');
  }
}
