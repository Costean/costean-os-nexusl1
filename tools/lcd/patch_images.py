# Costean OS costean.7 for the NexusL1: copy the costean.4 app image (byte for byte) and replace ONLY the
# pixel data of its 9 LVGL background images (same width, height, colour format and byte length). No instruction,
# string, layout, colour-register or version byte is changed. Recomputes the ESP image checksum + appended SHA-256.
import sys, struct, hashlib
# usage: python3 patch_images.py <costean.4 esp-miner-NexusL1.bin> <dir with the 9 art PNGs> <output .bin>
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from png2lv import encode
SRC, ART = sys.argv[1], sys.argv[2]
STOCK_SHA = 'b77b7c57ebb0afb0e3734c3f9824c8722d88a805d1c45311503dc709fc41304e'  # costean.4 app (field-tested)
b = bytearray(open(SRC, 'rb').read()); orig = bytes(b)
assert hashlib.sha256(orig).hexdigest() == STOCK_SHA, 'costean.4 app hash mismatch'
regions = []
IMGS = [('found_block', 0x3cc4c, 310, 130, True), ('safe', 0x5a49c, 267, 42, False), ('globalStats', 0x5fc44, 320, 170, True), ('splashscreen2', 0x879d0, 320, 170, True),
        ('settingsscreen', 0xaf75c, 320, 170, True), ('btcscreen', 0xd74e8, 320, 170, True), ('portalscreen', 0xff274, 320, 170, True), ('miningscreen2', 0x127000, 320, 170, True), ('initscreen2', 0x14ed8c, 320, 170, True)]
# segment table: make sure every image blob lies inside ONE DROM (data) segment, never in IROM/IRAM code
segs = []; pos = 24
for _ in range(b[1]):
    addr, ln = struct.unpack_from('<II', b, pos); segs.append((addr, pos + 8, ln)); pos += 8 + ln
def seg_of(o, l): return [s for s in segs if s[1] <= o and o + l <= s[1] + s[2]]
for n, off, w, h, alpha in IMGS:
    hdr, ds, ptr = struct.unpack_from('<III', b, off - 12)
    assert (hdr >> 10) & 0x7ff == w and (hdr >> 21) & 0x7ff == h and (hdr & 0x1f) == (5 if alpha else 4) and ds == w * h * (3 if alpha else 2), n
    assert ptr == 0x3c140020 + off - 0x20, n
    sg = seg_of(off, ds); assert len(sg) == 1 and 0x3c000000 <= sg[0][0] < 0x3e000000, (n, sg)   # DROM data segment
    d = encode(f'{ART}/{n}.png', w, h, alpha); assert len(d) == ds
    b[off:off + ds] = d; regions.append((off, ds, n))
pad = 15 - (pos % 16); cpos = pos + pad; assert b[23] == 1 and cpos + 1 + 32 == len(b)
ck = 0xEF
for addr, o, ln in segs:
    for x in b[o:o + ln]: ck ^= x
b[cpos] = ck; b[-32:] = hashlib.sha256(bytes(b[:-32])).digest()
inreg = lambda i: any(o <= i < o + l for o, l, _ in regions) or i == cpos or i >= len(b) - 32
stray = [i for i in range(len(b)) if orig[i] != b[i] and not inreg(i)]
assert not stray, len(stray)
open(sys.argv[3], 'wb').write(b)
print('wrote', sys.argv[3], len(b), 'bytes (stock size', len(orig), ') changed', sum(1 for p, q in zip(orig, b) if p != q), 'bytes; stray', len(stray))
for addr, o, ln in segs: print(f'  seg load {addr:#010x} file {o:#08x} +{ln}')
for o, l, n in regions: print(f'  {o:#08x} +{l:<7} lcd image {n}')
