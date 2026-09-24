# Store the three OpenHands encoders' weights as float16 (half the download),
# computing in float32 as before: each weight is cast back when the model loads.
#
#   python scripts/openhands-fp16.py <out-dir>    # needs onnx, onnxruntime, numpy
#
# Run against the float32 exports, it also checks the result: the embedding of
# the keypoints fixture and 40 perturbed copies, per encoder (cosine to the
# float32 output), and the ranking of the whole gallery for the fused vector.
# Measured when adopted: cosine >= 0.9999997, same best clip 41 of 41, top ten 10/10.
import json, sys, numpy as np, onnx, onnxruntime as ort
from onnx import helper, numpy_helper, TensorProto
root = str(__import__('pathlib').Path(__file__).resolve().parents[1]) + '/'
out = sys.argv[1]
fx = json.load(open(root + 'test/fixtures/keypoints.json'))
x0 = np.array(fx['tensor'], dtype=np.float32).reshape(fx['dims'])[None]
print('input dims', fx['dims'])
idx = json.load(open(root + 'data/signs.json'))
gal = np.fromfile(root + 'data/signs.bin', dtype=np.float32).reshape(idx['count'], idx['dim'])
rng = np.random.default_rng(0)
def variants():
    yield x0
    for k in range(40):
        x = x0 * (1 + rng.normal(0, .08)) + rng.normal(0, .03, x0.shape).astype(np.float32)
        x = np.roll(x, rng.integers(-3, 4), axis=2)
        yield x.astype(np.float32)
blocks32, blocks16 = [], []
for i, name in enumerate(['wlasl_slgcn', 'lsa64_slgcn', 'gsl_slgcn']):
    m = onnx.load(root + f'models/onnx/{name}.onnx')
    casts, keep = [], []
    for t in m.graph.initializer:
        a = numpy_helper.to_array(t)
        if t.data_type == TensorProto.FLOAT and a.size >= 256:
            h = numpy_helper.from_array(a.astype(np.float16), t.name + '__f16')
            keep.append(h)
            casts.append(helper.make_node('Cast', [h.name], [t.name], to=TensorProto.FLOAT, name=t.name + '__cast'))
        else:
            keep.append(t)
    del m.graph.initializer[:]
    m.graph.initializer.extend(keep)
    nodes = list(m.graph.node); del m.graph.node[:]; m.graph.node.extend(casts + nodes)
    onnx.checker.check_model(m)
    onnx.save(m, f'{out}/{name}.onnx')
    s32 = ort.InferenceSession(root + f'models/onnx/{name}.onnx', providers=['CPUExecutionProvider'])
    s16 = ort.InferenceSession(f'{out}/{name}.onnx', providers=['CPUExecutionProvider'])
    inp = s32.get_inputs()[0].name
    globals()["rng"] = np.random.default_rng(0)
    b32 = [s32.run(None, {inp: x})[0].ravel() for x in variants()]
    globals()["rng"] = np.random.default_rng(0)
    b16 = [s16.run(None, {inp: x})[0].ravel() for x in variants()]
    globals()["rng"] = np.random.default_rng(0)
    cos = [float(np.dot(a, b) / np.linalg.norm(a) / np.linalg.norm(b)) for a, b in zip(b32, b16)]
    print(name, 'min cosine', min(cos), 'mean', np.mean(cos))
    blocks32.append(b32); blocks16.append(b16)
def join(bs): 
    v = np.concatenate([b / np.linalg.norm(b) for b in bs]); return v / np.linalg.norm(v)
top1 = top10 = 0; n = len(blocks32[0])
for k in range(n):
    q32 = join([b[k] for b in blocks32]); q16 = join([b[k] for b in blocks16])
    r32 = np.argsort(-gal @ q32)[:10]; r16 = np.argsort(-gal @ q16)[:10]
    top1 += r32[0] == r16[0]; top10 += len(set(r32) & set(r16))
print(f'gallery ranking over {n} inputs: same best clip {top1}/{n}, top-10 overlap {top10/n:.2f}/10')
