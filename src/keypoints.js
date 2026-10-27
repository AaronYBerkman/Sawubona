// MediaPipe results -> the 27 keypoints the pretrained encoders were trained on.
//
// This is the browser twin of tools/keypoints.py and must stay in step with it:
// the encoder weights are fixed, so a point in the wrong slot is not a small
// error, it is a different graph node.
//
// The layout is MediaPipe Holistic's: pose 0-32, left hand 33-53, right hand
// 54-74. We never compute the face mesh - the preset selects nothing from it.

const N_POSE = 33;
const N_HAND = 21;

// openhands PoseSelect preset "mediapipe_holistic_minimal_27": nose, both eyes,
// both shoulders, both elbows, then for each hand the wrist, thumb tip, and the
// knuckle and tip of every finger.
export const MINIMAL_27 = [
  0, 2, 5, 11, 12, 13, 14,
  33, 37, 38, 41, 42, 45, 46, 49, 50, 53,
  54, 58, 59, 62, 63, 66, 67, 70, 71, 74,
];

export const N_NODES = MINIMAL_27.length; // 27
const LEFT_SHOULDER = 3;  // indexes INTO the selected 27
const RIGHT_SHOULDER = 4;

/** Match the gallery builder's 203-point -> OpenHands conversion exactly.
 * Holistic hands are assigned to body wrists, not the selfie handedness label.
 * Camera capture must use this same convention as the reference embeddings.
 */
export function pointsFromHolistic(frame, width, height) {
  const out = new Float32Array(N_NODES * 2);
  MINIMAL_27.forEach((node, i) => {
    const source = node < 33 ? node : node < 54 ? node - 33 + 161 : node - 54 + 182;
    out[i * 2] = frame[source * 3] / width;
    out[i * 2 + 1] = frame[source * 3 + 1] / height;
  });
  return out;
}

/**
 * One frame as a Float32Array(27 * 2), x then y per node.
 *
 * Absent parts stay zero, which is how the models were trained - a hand out of
 * shot is the zero vector, not a guess.
 */
export function framePoints(handResult, poseResult) {
  const full = new Float32Array(75 * 2);

  const pose = poseResult?.landmarks?.[0];
  if (pose) {
    for (let i = 0; i < Math.min(N_POSE, pose.length); i++) {
      full[i * 2] = pose[i].x;
      full[i * 2 + 1] = pose[i].y;
    }
  }

  const hands = handResult?.landmarks ?? [];
  for (let h = 0; h < hands.length; h++) {
    const label = handResult.handedness?.[h]?.[0]?.categoryName ?? (h === 0 ? 'Left' : 'Right');
    const base = label === 'Left' ? N_POSE : N_POSE + N_HAND;
    if (full[base * 2] !== 0 || full[base * 2 + 1] !== 0) continue;
    for (let j = 0; j < Math.min(N_HAND, hands[h].length); j++) {
      full[(base + j) * 2] = hands[h][j].x;
      full[(base + j) * 2 + 1] = hands[h][j].y;
    }
  }

  const out = new Float32Array(N_NODES * 2);
  for (let i = 0; i < N_NODES; i++) {
    out[i * 2] = full[MINIMAL_27[i] * 2];
    out[i * 2 + 1] = full[MINIMAL_27[i] * 2 + 1];
  }
  return out;
}

/**
 * Frames -> (2, T, 27) tensor data, centred on the shoulders and scaled by
 * shoulder width over the whole clip.
 *
 * One centre and one scale for the clip rather than per frame, matching
 * openhands' CenterAndScaleNormalize with frame_level=false: movement between
 * frames has to survive, only the signer's size and position should not.
 */
export function toTensor(frames, maxFrames = 128) {
  let seq = frames;
  if (seq.length > maxFrames) {
    seq = Array.from({ length: maxFrames }, (_, i) =>
      frames[Math.round((i * (frames.length - 1)) / (maxFrames - 1))]);
  }
  const T = seq.length;

  let cx = 0;
  let cy = 0;
  let width = 0;
  for (const f of seq) {
    const lx = f[LEFT_SHOULDER * 2];
    const ly = f[LEFT_SHOULDER * 2 + 1];
    const rx = f[RIGHT_SHOULDER * 2];
    const ry = f[RIGHT_SHOULDER * 2 + 1];
    cx += (lx + rx) / 2;
    cy += (ly + ry) / 2;
    width += Math.hypot(lx - rx, ly - ry);
  }
  cx /= T;
  cy /= T;
  width /= T;
  const scale = width > 1e-6 ? 1 / width : 1;

  // Channel-major: (C=2, T, V=27).
  const data = new Float32Array(2 * T * N_NODES);
  for (let t = 0; t < T; t++) {
    for (let v = 0; v < N_NODES; v++) {
      data[0 * T * N_NODES + t * N_NODES + v] = (seq[t][v * 2] - cx) * scale;
      data[1 * T * N_NODES + t * N_NODES + v] = (seq[t][v * 2 + 1] - cy) * scale;
    }
  }
  return { data, dims: [1, 2, T, N_NODES] };
}
