# Sawubona

## 👉 [Open Sawubona: aaronyberkman.github.io/Sawubona](https://aaronyberkman.github.io/Sawubona/)

Runs in the browser on a phone, tablet or computer with a camera (Chrome, Edge,
Safari or Firefox). Nothing to install, and nothing you sign leaves your device.

The dictionary and sentence builder open from the small sign index. The roughly
30 MB recognition gallery loads only after the camera starts. Landmark tracking
is capped at 20 passes per second on phones and small-memory devices (30 on
larger computers); the camera preview remains at its normal frame rate. After
the first visit, versioned app assets are served from the offline cache while
the browser checks the service worker for new deployments. HTML and code stay
on the same deployed version; after an update installs, the next visit uses it.

*Sawubona* is the Zulu greeting, literally "we see you" — which is what a camera
pointed at someone signing is for.

A practice app for someone learning **South African Sign Language**. It watches
through the webcam and tells you whether you signed the word you meant to, reads
your fingerspelling letter by letter, and looks up any of 1,858 SASL signs.
Everything runs on your own machine; nothing is uploaded, and there is nothing to
set up or train. It was built to work for a signer it has never seen.

To run it on your own machine instead:

```bash
npm start      # then open http://localhost:5173 in Chrome, Edge, Safari or Firefox
npm test
```

Every push to `main` is tested, built (`npm run build`) and published to the
`gh-pages` branch by `.github/workflows/pages.yml`.

**On a phone.** Add it to the home screen (Share → Add to Home Screen on an
iPhone; the install prompt or ⋮ → Install app on Android) and it opens full
screen with its own icon. The models are downloaded the first time sign checking
starts and then kept (`sw.js`), so later visits load at once and the app opens
without a connection. Phones and machines with little memory skip the second
SignCLIP view — 108 MB less to download and hold, for 2–3 points of accuracy
(`src/device.js`); add `?full` to the address to load it anyway, or `?light` to
skip it on a computer.

**Checking the drawings.** Each sign's drawing comes from its best clip by the
automatic audit (`tools/audit-clips.py`, cut down to `data/clip-audit.json` by
`scripts/export-clip-audit.py`): poorly tracked clips, clips cut off mid-sign or
acting out their opening picture go last. For 454 signs that changed which
drawing is shown — DOG's first Real SASL clip, tracked in under 60% of its
frames, gave way to NID's. [`review.html`](https://aaronyberkman.github.io/Sawubona/review.html)
shows every clip of each sign as the drawn signer, most suspect first, with
the audit's reasons beside each.

Every drawing is cut to where the sign is made (`src/watch.js` `signedPart`):
the tracker finds a hand only once it is raised, so frames with no hand at
either end are the presenter at rest, and resting hands clasped at the waist
can only be drawn as one tangle. The sentence builder plays the same clip as
Watch, with long holds shortened, so *I don't like fish* takes 5.9 s instead
of 12.2. `scripts/audit-hands.mjs` adds one more flag to the audit:
**hand-dropped**, a two-handed sign drawn with one hand for 35% or more of it
(206 clips; FISH [170], which looked like merged hands, is one). About half of
those checked by eye were poor, so it weighs lightly: it orders clips and
sorts review.html, and does not replace a clip on its own. Flag the badly tracked ones, download the result and
commit it as `data/clip-review.json`: the app then skips flagged clips (a sign
whose every clip is flagged shows no drawing, only the link to its video).

Needs [Node.js](https://nodejs.org/) 18 or later and a webcam. The first run needs
an internet connection to fetch the tracking and model runtimes (MediaPipe and
onnxruntime-web, from public CDNs); the sign models themselves ship in `models/`.

## What it does

**Signs.** Pick a lesson — 32 of them, built from the course word list and the
National Institute for the Deaf wall charts, about ten words each — or make your
own from the dictionary.

- *Quiz me* shows a word. You sign it, and it says ✓ matched, ≈ close, or ✗ that
  looked like something else, naming what it looked like. Words you miss come
  round more often.
- *What did I sign?* names the sign you made, out of your lesson.
- *A phrase* splits a short sequence of signs where your hands pause and reads
  each one — a check on which signs you made and in what order.

Every quiz word links to its video on [Real SASL](https://www.realsasl.com/).

**Fingerspelling.** Letters are read live from one hand. *Spell a word* lights up
each letter as you hold it — names, places, words from your lesson, or anything
you type. J and Z are drawn in the air, so they are read from the path of the
fingertip rather than a held shape (`src/motion-letters.js`): the I hand drawing
down and hooking is J, the index finger drawing across, down the diagonal and
across again is Z, either way round. Measured on real signers
(`scripts/bench-motion-letters.mjs`, over the tracked hands of NID's letter
clips and four alphabet videos with checked letter holds):

| | J | Z |
|---|---:|---:|
| NID's own letter clips | read | read |
| alphabet videos, letter expected (*Spell a word*) | 3 of 4 | 4 of 4 |
| alphabet videos, not expected (*Free spelling*) | 3 of 4 | 2 of 4 |

NID's I and Y (the J hand held still, and the thumb held out) are never read as
J. Over 36 minutes of those videos — mostly talking and ordinary signing, not
spelling — 11 readings fall outside the J and Z moments when not expecting one;
several are the presenter repeating the letter being taught. A letter is read
from a held shape into a stroke (hold I, then draw), which is what keeps
ordinary signing out; when the next letter to spell is J or Z, a stroke may also
start the moment the shape appears, as fluent signers draw it.
`test/motion.test.mjs` pins NID's four clips.

**Dictionary.** Search all 1,858 signs, open the Real SASL video where there is one, add it to a lesson.

**Watch and Compare.** Any sign can be watched in the page as a drawn signer: an
illustrated figure — body, clothing, hands, and a face with brows, eyes, nose and
lips drawn from the tracked face outline — that performs the movement tracked in
the Real SASL clip, at full or half speed, mirrored for left-handed signers.
After a quiz try, *Compare* plays the learner's own try, drawn the same way,
beside the reference on one clock. The drawing is an illustration of the tracked
movement, never the video, and every view of it links the Real SASL clip it came
from. The try is kept in memory only, in that tab, until the next recording.

## How well it works

Every number here was measured on signers the model had not seen — never on the
data it learned from.

**Fingerspelling: 96.4% of held letters**, testing on each of five SASL presenters
in turn after training on the other four:

| held-out presenter | ASL-HG only | SASL only | both (shipped) |
|---|---:|---:|---:|
| Sign Tutors | 88% | 85% | **99%** |
| National Institute for the Deaf tutor | 79% | 86% | **96%** |
| A-to-Z presenter | 68% | 82% | **91%** |
| Lesson One presenter | 60% | 70% | **90%** |
| ABC / Day 1 presenter | 71% | 77% | **87%** |

Neither source alone is enough; together they are. The weakest letters are Q
(2 of 5) and D (14 of 17); T, often confused with S, is 10 of 10.

**Signs, by lesson size.** Top answer right / right answer in the top three,
against the whole 3,483-clip gallery (`data/bench-gallery.txt`): a Real SASL
presenter's clip, and an NID signer's clip matched only to Real SASL clips of the
word, so the right answer is always someone else signing:

| words compared against | Real SASL top-1 | top-3 | NID signer top-1 | top-3 |
|---|---:|---:|---:|---:|
| 5 | 84% | 96% | 89% | 99% |
| 10 | 78% | 91% | 83% | 96% |
| 20 | 71% | 85% | 74% | 92% |
| 50 | 62% | 77% | 62% | 83% |
| whole dictionary (1,858) | 26% | 49% (top-5) | 18% | 39% (top-5) |

On the same queries the previous 1,656-clip gallery scored 82% and 75% at 10
words; against only those 1,656 clips the new references score 71% and 89%.
NID's other clips pull an NID query away from its Real SASL match (83% here).

That is why practice happens in lessons. These figures are on *answerable*
attempts: Real SASL sometimes files two different signs under one English word,
and no system can match those, so they were set aside by a model that is not
one of the ones being scored (see [How the sign numbers were measured](#how-the-sign-numbers-were-measured)).
A learner copying the reference clip is in the answerable case by construction.

**The quiz, on 10-word lessons:**

| | ✓ matched | ≈ close | ✗ |
|---|---:|---:|---:|
| you signed the word asked | 82% | 15% | 2% |

and it wrongly says ✓ 1.4% of the time when you signed a different word from the
lesson, and 5.1% when you signed something unrelated to the lesson. That last
figure is why a pass also needs the target to rank in the top 100 of the whole
dictionary: judged on the lesson alone, an unrelated sign would pass about one
time in ten by elimination (`tools/quiz-thresholds.py`).

**Learns your signing.** The models have never seen you. When the quiz says a
try matched, or you tap *That's it* on a guess, that try's embeddings are kept
on your device (`src/personal.js`: numbers only, never video, two per word;
*Forget my signing* clears them) and count beside the dictionary's clips.
Measured through the page's own code (`scripts/bench-personal.mjs`), with NID
signers standing in for the learner and only Real SASL clips as the dictionary,
10-word lessons:

| | right answer | a different word |
|---|---:|---:|
| quiz passes, dictionary only | 58% | 3.1% |
| quiz passes, with your earlier try of the word asked | **70%** | 4.5% |
| *What did I sign?* top guess, dictionary only | 60% | |
| … with your tries of every lesson word | **65%** | |
| … with tries of the other words only | 52% | |

The last row is why guesses count your tries only once every lesson word has
one, and the quiz only your tries of the word asked. A learner at a webcam is
not an NID presenter in a studio, so the gain for you may differ.

If a quiz attempt is marked close or not yet even though the learner signed the
requested word, *I signed … — learn this try* saves it as a personal example.
The lesson page shows how many of its words have a personal example. *Teach
Sawubona this lesson* walks through every missing word so the learner can build
a complete personal gallery deliberately; once complete it can collect a fresh
second example of every word. This is an explicit correction: the app never
silently treats a failed guess as correct.

**How sure a guess is.** *What did I sign?* says Sure, Maybe or Not sure, from
how far the top guess stands clear of the next (`src/confidence.js`). On the
same data, in 5- to 20-word lessons:

| | share of tries | top guess right | right one in the top three |
|---|---:|---:|---:|
| Sure | 32–56% | 83–91% | 88–97% |
| Maybe | 11–15% | 54–69% | 70–86% |
| Not sure | 33–57% | 30–40% | 50–78% |

Across the whole dictionary even a clear guess was right only about half the
time, so there it never says Sure.

## What it does not do

- **It is not a translator.** No system can yet translate signed language from a
  webcam, and this does not try. The phrase mode reads a list of signs, not a
  sentence: SASL grammar lives in space, facial expression and how signs are
  modified, and none of that is interpreted. The face is tracked, as part of a
  sign's shape, but expressions are not judged.
- **A match is not a grade.** "That looked like FRIDAY" is not "that was a
  perfect FRIDAY". The teacher is the judge of that.
- **SASL varies.** Signs differ between regions and schools. Where a course
  teaches a different version from Real SASL, the course wins.
- **Numbers are signs here, not fingerspelling.** None of the alphabet videos
  the letter reader learned from shows the number handshapes, and the dictionary
  has the counting signs, so numbers are practised in the *Numbers* lesson.

## How it works

```
webcam ─ MediaPipe (hands, body, face) ─┬─ 27 points ── OpenHands ×3 ──┐
                                        └─ 203 points ─ SignCLIP ×2 ────┴─ fused ─ rank against 3,483 clips
                                        └─ one hand ── letter network ─ letter
```

**Signs.** Two families of pretrained sign models describe a recording as a
vector, in a way that ignores who is signing. Neither has seen SASL; what they
learned — how to describe a sign while discarding the signer — is the part that
transfers.

- [OpenHands](https://github.com/AI4Bharat/OpenHands) SL-GCN encoders trained on
  American, Argentinian and Greek sign language, on 27 body and hand points.
- [SignCLIP](https://github.com/J22Melody/fairseq/tree/main/examples/MMPT)
  (Jiang et al., 2024), fine-tuned on ASL Citizen — 52 signers, 2,731 signs — on
  203 body, face and hand points. Alone, it finds the right sign across the whole
  dictionary 1.6 times as often as the OpenHands encoders do. A second SignCLIP
  fine-tune (`asl_finetune`, "asl3") is fused alongside it: +2.2 points on a
  10-word lesson for Real SASL queries and +3.1 for NID's signer, whole gallery
  (paired 95% intervals above zero, `data/bench-gallery.txt`).

Each model's similarity to every reference clip is standardised for the attempt
and the two are added. Each reference is stored twice, as signed and mirrored, so
a left-handed learner meets a left-handed version of every sign.

**Letters.** A small network over one hand's 21 landmarks, trained on 306 letter
holds from five SASL presenters — every one checked by eye against the video —
plus ASL-HG's ten signers for the letters the two alphabets share.

## Data, models and credits

- **Reference signs:** [Real SASL](https://www.realsasl.com/), a community-built
  dictionary (1,843 clips), and the free tier of the National Institute for the
  Deaf's SASL Video Dictionary on learnsasl.com (1,640 clips so far; about 7,400
  when the download finishes). The app contains numbers derived from the clips,
  never the videos: the sign models' embeddings of each clip, for matching
  (`data/signs.bin`, `data/signclip*.bin`, 10.7 MB each), and, for Watch and
  Compare, the tracked positions of each presenter's body, hands and 128-point
  face outline over time (`data/replay.json` plus `data/replay/*.bin`, 27 MB in
  shards of 500 clips fetched per sign), which the app draws as an illustrated
  figure, facial features included. It links to the site to watch the videos. Real
  SASL's videos are uploaded by Deaf community members documenting their own
  language; please don't redistribute derived data beyond personal study without
  asking them (`calibration/permission-request.md` is a draft of that request).
- **Letters:** SASL alphabet videos by the National Institute for the Deaf, The
  Sign Tutors and three other YouTube presenters; and **ASL-HG** — *A Comprehensive
  Image Dataset of American Sign Language Hand Gestures*, Mendeley Data,
  [doi:10.17632/j4y5w2c8w9.1](https://doi.org/10.17632/j4y5w2c8w9.1), licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Models:** SignCLIP (Zifan Jiang et al., *SignCLIP: Connecting Text and Sign
  Language by Contrastive Learning*, 2024); OpenHands (AI4Bharat); tracking by
  Google [MediaPipe](https://ai.google.dev/edge/mediapipe).
- **Lessons:** the course word list, and word lists (not images) from three
  National Institute for the Deaf wall charts.

## Rebuilding

Everything the app loads is generated; the steps, in order:

```bash
# Python 3 with mediapipe==0.10.35, torch, onnx, onnxruntime, opencv, pose-format
python tools/ingest.py && python tools/keypoints.py   # landmarks per clip (OpenHands)
python tools/holistic.py extract && python tools/holistic.py pack   # 203-point poses -> data/holistic-v3
python tools/export-signclip.py                       # -> models/onnx/signclip.onnx (int8)
python tools/pack-signclip.py                         # test fixtures
python tools/export-signclip.py asl3                  # -> models/onnx/signclip-asl3.onnx (int8)
python scripts/openhands-fp16.py models/onnx          # OpenHands weights stored as float16 (half the size)
python scripts/make-brand.py                          # app icons and the link preview card
python scripts/export-clip-audit.py <research-root>  # the clip audit, cut down for the page
node scripts/audit-hands.mjs                          # then flag two-handed signs that lose a hand
python tools/build-gallery.py [--extract]             # every clip in holistic-v3 -> signs.json,
                                                      # all embeddings + replay (incremental)
python tools/bench-gallery.py                         # -> data/bench-gallery.txt
python tools/compare-encoders.py                      # the sign tables above

python tools/handpoints.py video <video> data/handpoints/<name>.npz   # per alphabet video
python tools/handpoints.py images external/aslhg/asl_dataset data/handpoints/aslhg.npz
python tools/review-holds.py <name>                   # propose letters, draw review sheets
python tools/letters.py eval | ablate | export        # -> data/letter-model.json

python tools/make-lessons.py                          # -> data/lessons.json
python tools/quiz-thresholds.py                       # the quiz table above
```

The large inputs — Real SASL clips in `~/Movies/RealSASL`, the SignCLIP
checkpoint and ASL-HG in `external/` — are not part of the app.

`npm test` pins every browser port to its Python original using fixtures the
Python side wrote: letter features and logits, the 203-point frame assembly
(including hands whose labels contradict the wrists they sit on), clip
normalisation, and the OpenHands keypoint tensor.

## Findings worth keeping

The things that cost real time, or changed a number:

- **SASL's T is not ASL's T.** SASL folds the index finger down over the thumb
  tip; ASL pokes the thumb out between index and middle finger. One presenter says
  so on camera and shows the American T crossed out, and all four other presenters
  agree. ASL-HG's T is therefore excluded from training.
- **SASL's Y is ASL's Y** (thumb and little finger), in all four videos that show
  it with the letter on screen. An earlier capture pass had read it as V's shape.
- **Labels must be checked by eye.** Automatic alignment of alphabet videos
  mislabelled enough holds — M in front of a printed N, a V run labelled H — that
  fixing them moved letter accuracy from 84% to 94%. `tools/review-holds.py` draws
  contact sheets for exactly this.
- **Augmentation, measured:** mirroring and rotation each add 1.6 points; random
  per-joint jitter *costs* 2.6, because it blurs what separates M from N and T
  from S. The shipped model uses mirroring and rotation only.
- **Presenters rest the idle hand in view**, detected as confidently as the
  signing hand. Taking the first detected hand read every letter as an open palm;
  the spelling hand is the highest wrist.
- **MediaPipe's face detector is made for selfies.** On presenters standing back it
  missed 29% of the frames where the body was found, so the face is now located in
  a crop placed from the body, as MediaPipe Holistic does (96% found). Scored
  reference-against-reference this changed nothing. Scored the way the app is
  used — an attempt at a webcam, where the face is always found — it was worth
  ten points: against the old references a 10-word lesson dropped from 73% to 60%
  for SignCLIP. Test in the conditions the app runs in, not the convenient ones.
- **The same model gives different numbers in different runtimes.** The int8
  SignCLIP model agrees with itself across native onnxruntime and onnxruntime-web
  only to cosine 0.995, so the references are embedded with onnxruntime-web itself
  (`tools/embed-gallery.mjs`) and a live attempt meets them through identical
  arithmetic.
- **Slow signing is fine.** Stretching attempts to 1.6× their length — slower than
  most learners — costs SignCLIP 2.4 points across the whole dictionary and
  nothing measurable on a 10-word lesson (`tools/speed-test.py`). Reading the
  attempt at several speeds and keeping the best adds nothing, so the app does not.
- **Reference frame rate is the source rate.** `ingest.py`'s `SAMPLE_HZ = 20`
  reads like 20 fps, but its stride rounds to 1 for 25 and 29.97 fps video, so
  the references run at 25–30 fps and attempts are resampled to 27 to match.
- **Don't pad a batch to its longest clip** for the OpenHands encoders: they
  average-pool over time, so a clip's embedding changes with its batchmates.
- **MediaPipe on Apple Silicon:** 1.0.x aborts in Metal setup even with the CPU
  delegate; 0.10.35 works. Worker processes must be spawned, not forked.

### How the sign numbers were measured

Every clip whose gloss has another clip is a query; the gallery is every other
clip, and a sign scores its best clip. About half of those queries cannot be
passed, because Real SASL sometimes lists different signs under one English word.
To set them aside without letting any scored model grade its own homework, one
OpenHands encoder (WLASL) judges which same-gloss pairs are genuinely the same
sign, and only models that do not include it are scored. "Practice" figures draw
the other words of a K-word lesson at random, many times over.

### Earlier approaches

Hand-designed landmark features with dynamic time warping topped out at 30% top-1
against 25 signs; twelve feature variants all landed between 22% and 31%. The
three OpenHands encoders replaced them, and SignCLIP joined them. The full
research log, including everything that did not help, is in
`archive/README-research-log.md`; retired code is in `archive/`.

## Recognition and learning limits

Automatic recognition is on by default after you start the camera: raise your
hands, sign, then rest them to receive a guess. Record/Space remain optional.
A held hand does not trigger repeated captures; lower your hands before the next
attempt. Results arrive after each captured sign or phrase, not as a live translation.

Live OpenHands input now follows the same anatomical hand-slot convention as the
reference gallery. Capped recordings retain their full duration, and phrase
splitting uses elapsed time rather than assuming a desktop frame rate. Regression
fixtures check these properties; they do not establish accuracy on a new signer
or phone. Recognition remains experimental, especially outside a short lesson.

The larger sign viewer includes a stable hand close-up, quarter-speed playback,
and previous/next frame controls. These enlarge existing tracked detail; they
cannot restore missed or incorrectly tracked fingers. Compare the source video
when a drawing is unclear.

Sentence output is a **draft learning guide**, not a verified SASL translation.
The 535 sentence cases check software regressions against expected text; they do
not certify linguistic accuracy. Unsupported constructions and unmapped words
are flagged and cannot be played or automatically checked as correct sentences.
Full meaning, facial grammar, spatial reference and regional variation need
review by a fluent Deaf SASL teacher. Sources are linked in the sentence builder.
