"""
Writes tests/fixtures/stage-box.glb: a small binary glTF 2.0 for the 3D stage's tests
(a coloured box 2 x 1 x 0.6, off-centre on purpose, with one animation "spin").
Run: python scripts/make-test-glb.py
"""
import json
import math
import os
import struct

# A box from (-0.5, 0, -0.3) to (1.5, 1, 0.3): the stage must fit and centre it.
x0, x1, y0, y1, z0, z1 = -0.5, 1.5, 0.0, 1.0, -0.3, 0.3
faces = [
    ((1, 0, 0), [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)]),
    ((-1, 0, 0), [(x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (x0, y0, z0)]),
    ((0, 1, 0), [(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)]),
    ((0, -1, 0), [(x0, y0, z1), (x0, y0, z0), (x1, y0, z0), (x1, y0, z1)]),
    ((0, 0, 1), [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]),
    ((0, 0, -1), [(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)]),
]
positions, normals, indices = [], [], []
for n, quad in faces:
    base = len(positions)
    positions += quad
    normals += [n] * 4
    indices += [base, base + 1, base + 2, base, base + 2, base + 3]

times = [0.0, 1.0, 2.0]
quats = []
for t in times:
    a = math.pi * t  # half a turn a second round Y
    quats.append((0.0, math.sin(a / 2), 0.0, math.cos(a / 2)))

def pack(fmt, rows):
    return b"".join(struct.pack(fmt, *r) for r in rows)

chunks = [
    pack("<3f", positions),
    pack("<3f", normals),
    struct.pack(f"<{len(indices)}H", *indices),
    struct.pack(f"<{len(times)}f", *times),
    pack("<4f", quats),
]
views, blob = [], b""
for c in chunks:
    while len(blob) % 4:
        blob += b"\0"
    views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(c)})
    blob += c
while len(blob) % 4:
    blob += b"\0"

gltf = {
    "asset": {"version": "2.0", "generator": "estabrek make-test-glb"},
    "scene": 0,
    "scenes": [{"nodes": [0]}],
    "nodes": [{"name": "Box", "mesh": 0}],
    "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 0}]}],
    "materials": [{"name": "Teal", "pbrMetallicRoughness": {"baseColorFactor": [0.1, 0.8, 0.75, 1], "metallicFactor": 0.1, "roughnessFactor": 0.5}}],
    "buffers": [{"byteLength": len(blob)}],
    "bufferViews": views,
    "accessors": [
        {"bufferView": 0, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": [x0, y0, z0], "max": [x1, y1, z1]},
        {"bufferView": 1, "componentType": 5126, "count": len(normals), "type": "VEC3"},
        {"bufferView": 2, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
        {"bufferView": 3, "componentType": 5126, "count": len(times), "type": "SCALAR", "min": [times[0]], "max": [times[-1]]},
        {"bufferView": 4, "componentType": 5126, "count": len(quats), "type": "VEC4"},
    ],
    "animations": [{"name": "spin", "samplers": [{"input": 3, "output": 4, "interpolation": "LINEAR"}], "channels": [{"sampler": 0, "target": {"node": 0, "path": "rotation"}}]}],
}
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
body = struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(blob), 0x004E4942) + blob
glb = struct.pack("<III", 0x46546C67, 2, 12 + len(body)) + body
out = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "stage-box.glb")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "wb").write(glb)
print(out, len(glb), "bytes")
