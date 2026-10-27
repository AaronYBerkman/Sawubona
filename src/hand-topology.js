// Which of the 21 hand landmarks connect to which, as a skeleton.
//
// Pure data, kept apart from vision.js so it can be imported without dragging in
// the MediaPipe runtime - vision.js loads that from a CDN, which Node cannot
// resolve. The decoration generator needs the topology and nothing else.

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],        // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],        // index
  [5, 9], [9, 10], [10, 11], [11, 12],   // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20],// pinky
  [0, 17],                               // palm edge
];
