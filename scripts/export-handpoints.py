# Alphabet videos' hand landmarks -> JSON for scripts/bench-motion-letters.mjs.
#
#   python scripts/export-handpoints.py <research-root> <out-dir>
#
# <research-root> is the working tree with data/handpoints/*.npz (tools/handpoints.py)
# and calibration/letter-labels.json (the holds checked by eye). J and Z are
# movements, so they have no hold; each gets a window instead: J between the
# last I and the first K after it, Z the six seconds after the last Y.
import json
import os
import sys

import numpy as np

root, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
labels = json.load(open(f'{root}/calibration/letter-labels.json'))


def dump(npz, name, windows):
    d = np.load(npz)
    frames = [{'t': float(t)} if not present else
              {'t': float(t), 'img': img[:, :2].round(5).tolist(), 'world': world.round(5).tolist()}
              for t, present, img, world in zip(d['t'], d['present'], d['img'], d['world'])]
    json.dump({'name': name, 'aspect': float(d['aspect']), 'frames': frames, 'windows': windows},
              open(f'{out}/{name}.json', 'w'))


for key, holds in labels.items():
    npz = f'{root}/data/handpoints/{key}.npz'
    if not os.path.exists(npz):
        continue
    t = np.load(npz)['t']
    span = lambda letter: [(float(t[h['start']]), float(t[min(h['end'], len(t) - 1)])) for h in holds if h['letter'] == letter]
    windows = {}
    i_end = max((e for _, e in span('I')), default=None)
    k_after = [s for s, _ in span('K') if i_end is not None and s > i_end]
    if k_after:
        windows['J'] = [i_end - 0.3, min(k_after) + 0.3]
    if span('Y'):
        y_end = max(e for _, e in span('Y'))
        windows['Z'] = [y_end - 0.3, y_end + 6.0]
    dump(npz, key, windows)
for npz in sorted(os.listdir(f'{root}/data/handpoints/nid-letters')):
    dump(f'{root}/data/handpoints/nid-letters/{npz}', f'nid-letter-{npz[:-4]}', {})
