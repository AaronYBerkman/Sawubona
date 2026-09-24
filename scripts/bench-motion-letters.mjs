// J and Z against real signers: the reader (src/motion-letters.js) run over
// whole alphabet videos, frame by frame, as the page would run it.
//
//   node scripts/bench-motion-letters.mjs <dir> [--expect J|Z]
//
// <dir> holds one JSON per video, written by scripts/export-handpoints.py from
// tools/handpoints.py's output and the checked letter holds: { name, aspect,
// frames: [{ t, img?, world? }], windows: { J: [from, to], Z: [from, to] } }.
// A window is where the letter must be (between the last I and the next K, or
// just after the last Y): a reading there is a hit, one elsewhere a false alarm.
// Presenters repeat J and Z while teaching them, and a video may run through
// the alphabet more than once, so some "false alarms" are real letters: check
// them against the letters held around them before trusting the count.
import fs from 'node:fs';
import { createMotionReader, motionShape } from '../src/motion-letters.js';

const dir = process.argv[2];
const expect = process.argv.includes('--expect') ? process.argv[process.argv.indexOf('--expect') + 1] : null;
const hits = { J: 0, Z: 0 }; const windows = { J: 0, Z: 0 }; let alarms = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const v = JSON.parse(fs.readFileSync(`${dir}/${f}`));
  const reader = createMotionReader();
  const read = [];
  const shapes = { J: 0, Z: 0, none: 0 };
  for (const fr of v.frames) {
    if (!fr.img) { reader.clear(); continue; }
    const img = fr.img.map(([x, y]) => ({ x, y }));
    const world = fr.world.map(([x, y, z]) => ({ x, y, z }));
    shapes[motionShape(world) ?? 'none']++;
    const r = reader.push({ t: fr.t * 1000, img, world, aspect: v.aspect, expect });
    if (r) read.push({ letter: r.letter, t: fr.t });
  }
  const w = v.windows ?? {};
  const inside = (r) => w[r.letter] && r.t >= w[r.letter][0] && r.t <= w[r.letter][1];
  for (const l of ['J', 'Z']) if (w[l]) { windows[l]++; if (read.some((r) => r.letter === l && inside(r))) hits[l]++; }
  const wrong = Object.keys(w).length ? read.filter((r) => !inside(r)) : [];
  alarms += wrong.length;
  console.log(`${v.name.padEnd(14)} shape J/Z ${shapes.J}/${shapes.Z} of ${v.frames.length}  read ${read.map((r) => `${r.letter}@${r.t.toFixed(1)}`).join(' ') || '-'}`);
}
console.log(`\n${expect ? `expecting ${expect}: ` : ''}J read in ${hits.J} of ${windows.J} windows, Z in ${hits.Z} of ${windows.Z}; ${alarms} readings outside them`);
