# The clip audit, cut down to what the page uses: data/clip-audit.json.
#
#   python scripts/export-clip-audit.py <research-root>
#
# tools/audit-clips.py (in the research tree) scores every dictionary clip for
# what makes its drawn signer poor: poorly tracked, cut off mid-sign, acting out
# the opening picture, the signing hand below the waist or out of frame, and
# picks each sign's preferred clip. The page shows the preferred clip first
# (src/watch.js) and review.html shows the scores beside each drawing.
import json
import sys

root = sys.argv[1]
audit = json.load(open(f'{root}/data/clip-audit.json'))
replay = json.load(open('data/replay.json'))
shipped = {c['file'] for c in replay['clips']}
count = {}
for c in replay['clips']:
    count[c['label']] = count.get(c['label'], 0) + 1
out = {
    'about': 'Made by scripts/export-clip-audit.py from tools/audit-clips.py. clips: file -> [suspicion score, flags] '
             'for every shipped clip with a flag; preferred: the clip to show first, for signs with more than one.',
    'generated': audit.get('generated'),
    'preferred': {label: f for label, f in sorted(audit['preferred'].items()) if f in shipped and count.get(label, 0) > 1},
    'clips': {f: [c.get('score', 0), c.get('flags', [])] for f, c in sorted(audit['clips'].items())
              if f in shipped and (c.get('score', 0) or c.get('flags'))},
}
json.dump(out, open('data/clip-audit.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(f"{len(out['clips'])} flagged clips, {len(out['preferred'])} preferred")
