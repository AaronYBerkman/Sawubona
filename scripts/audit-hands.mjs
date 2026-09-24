// Flag drawings of two-handed signs that lose a hand: data/clip-audit.json.
//
//   node scripts/audit-hands.mjs        (after scripts/export-clip-audit.py)
//
// The drawn signer can only draw a hand the tracker found. In a two-handed
// sign whose second hand drops out part-way, the figure shows one hand and a
// faint ghost where the other was last seen, which reads as the hands merging
// (FISH [170]: one hand for 39% of the sign; FISH [171], shown instead: 17%).
//
// A sign counts as two-handed when each hand is seen in at least 30% of the
// frames where either is; it is flagged "hand-dropped" when only one is seen
// in 35% or more of them (206 of 3,483 clips). Checked by eye on a sample,
// about half the flagged drawings were poor, so the flag adds one point of
// suspicion: enough to put a clip behind an otherwise equal one and first in
// review.html, not enough to replace a clip on its own.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Replay } from '../src/replay-data.js';
import { signedPart } from '../src/watch.js';

const data = (f) => new URL(`../data/${f}`, import.meta.url);
const info = JSON.parse(readFileSync(data('replay.json')));
const inflate = (buf) => { const raw = gunzipSync(buf); return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength); };
const replay = new Replay(info, null, { load: async (shard) => inflate(readFileSync(data(shard.file))) });
for (let s = 0; s < replay.shards.length; s++) await replay.loadShard(s);

const seen = (f, i) => f[i * 3] !== 0 || f[i * 3 + 1] !== 0 || f[i * 3 + 2] !== 0;
const FLAG = 'hand-dropped';

/** Share of a two-handed sign's frames drawn with only one hand (0 for one-handed signs). */
export function oneHandShare(frames) {
  const on = frames.map((f) => [seen(f, 161), seen(f, 182)]);
  const any = on.filter(([l, r]) => l || r).length;
  if (!any || ![0, 1].every((h) => on.filter((x) => x[h]).length >= 0.3 * any)) return 0;
  return on.filter(([l, r]) => l !== r).length / any;
}

const audit = JSON.parse(readFileSync(data('clip-audit.json')));
let flagged = 0;
for (const clip of replay.clips) {
  const share = oneHandShare(signedPart(replay.clipFrames(clip.file), replay.fps));
  const [score, flags] = audit.clips[clip.file] ?? [0, []];
  const had = flags.includes(FLAG);
  const rest = flags.filter((f) => f !== FLAG);
  const base = had ? score - 1 : score;
  if (share >= 0.35) {
    audit.clips[clip.file] = [base + 1, [...rest, FLAG]];
    flagged++;
  } else if (had) {
    if (rest.length || base) audit.clips[clip.file] = [base, rest];
    else delete audit.clips[clip.file];
  }
}
audit.clips = Object.fromEntries(Object.entries(audit.clips).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(data('clip-audit.json'), JSON.stringify(audit));
console.log(`${flagged} clips flagged ${FLAG}`);
