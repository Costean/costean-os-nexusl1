# Costean OS (costean.4 LCD layout) for NexusL1: in-place patch of the stock nexus.v1.0.4.4 app image (same size).
#  data : 9 LCD images, app version string, recovery page               (as the first Costean build)
#  code : ONLY the immediate operands of the SquareLine UI::init layout instructions (movi/movi.n a11 feeding
#         lv_obj_set_x / set_y / set_align for 33 labels) and 4 text-colour register loads (movi.n aR,0 -> -1).
#         Same instruction, same register, same length; every site is decoded and checked before writing.
import sys, os, struct, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
# usage: patch_app8_costean.py <stock esp-miner-NexusL1.bin (BitLuck nexus.v1.0.4.4 OTA app)> <output.bin>
from png2lv import encode
from layout_isa import L, COLREG, LITCOL, dec, enc, off, read_layout, read_litcols
from layout_costean import LAYOUT, COLOURS, LITERALS
SRC = sys.argv[1]; ART = os.path.join(HERE, 'art-costean')
VERSION = b'costean-nexusl1-1.0.4.4'
b = bytearray(open(SRC, 'rb').read()); orig = bytes(b); regions = []
def put(o, data, what):
    assert o + len(data) <= len(b); b[o:o + len(data)] = data; regions.append((o, len(data), what))
read_layout(orig)   # asserts every site is the expected movi/movi.n a11 -> l32i a10 -> call8 lv_obj_set_x/y/align
IMGS = [('found_block', 0x3cc4c, 310, 130, True), ('safe', 0x5a49c, 267, 42, False), ('globalStats', 0x5fc44, 320, 170, True), ('splashscreen2', 0x879d0, 320, 170, True),
        ('settingsscreen', 0xaf75c, 320, 170, True), ('btcscreen', 0xd74e8, 320, 170, True), ('portalscreen', 0xff274, 320, 170, True), ('miningscreen2', 0x127000, 320, 170, True), ('initscreen2', 0x14ed8c, 320, 170, True)]
for n, o, w, h, alpha in IMGS:
    hdr, ds, ptr = struct.unpack_from('<III', b, o - 12)
    assert (hdr >> 10) & 0x7ff == w and (hdr >> 21) & 0x7ff == h and (hdr & 0x1f) == (5 if alpha else 4) and ds == w * h * (3 if alpha else 2), n
    assert ptr == 0x3c140020 + o - 0x20, n
    d = encode(f'{ART}/{n}.png', w, h, alpha); assert len(d) == ds; put(o, d, 'lcd image ' + n)
assert struct.unpack_from('<I', b, 0x20)[0] == 0xABCD5432 and b[0x30:0x40].startswith(b'nexus.v1.0.4.4\0')
put(0x30, VERSION.ljust(32, b'\0'), 'app version')
s = b.find(b'<html><meta charset="UTF-8"><style>body {'); e = b.find(b'\0', s); Ln = e - s
new = open(os.path.join(HERE, 'recovery-costean.html'), 'rb').read().rstrip(b'\n'); assert b'%' not in new and len(new) <= Ln
put(s, new.ljust(Ln, b' '), 'recovery page')
# ---- layout immediates ----
nlay = 0
for name, (x, y, al) in LAYOUT.items():
    for va, v, k in zip(L[name], (x, y, al), ('x', 'y', 'align')):
        kind, old = dec(orig, va)
        if old == v: continue
        data = enc(kind, v); assert len(data) == (2 if kind == 'movi.n' else 3)
        put(off(va), data, f'layout {name}.{k} {old}->{v} ({kind})'); nlay += 1
for scr, v in COLOURS.items():
    va, reg, labs, bg = COLREG[scr]; kind, old = dec(orig, va, reg); assert kind == 'movi.n' and old == 0
    put(off(va), enc('movi.n', v, reg), f'text colour a{reg} {scr}: 0x0000 -> 0x{v & 0xffff:04X} ({",".join(labs)}{" + screen bg" if bg else ""})')
for n, v in LITERALS.items():
    va, stock, user = LITCOL[n]; o = off(va); assert struct.unpack_from('<I', b, o)[0] == stock
    ui = off(user); assert b[ui] & 0xf == 1 and ((user + 3) & ~3) + (((b[ui + 1] | b[ui + 2] << 8) - 65536) << 2) == va  # the l32r really loads it
    put(o, struct.pack('<I', v), f'literal colour {n} 0x{stock:04X} -> 0x{v:04X}')
# ---- ESP image checksum + SHA256 ----
nseg = b[1]; pos = 24; ck = 0xEF
for _ in range(nseg):
    addr, ln = struct.unpack_from('<II', b, pos); pos += 8
    for xx in b[pos:pos + ln]: ck ^= xx
    pos += ln
pad = 15 - (pos % 16); cpos = pos + pad; assert b[23] == 1 and cpos + 1 + 32 == len(b)
b[cpos] = ck; b[-32:] = hashlib.sha256(bytes(b[:-32])).digest()
# re-decode the result: every layout site still the same instruction kind/register, now with the Costean layout values
lay, cols = read_layout(bytes(b))
for name, (x, y, al) in LAYOUT.items(): assert (lay[name]['x'], lay[name]['y'], lay[name]['al']) == (x, y, al), name
out = sys.argv[2]; open(out, 'wb').write(b)
inreg = lambda i: any(o <= i < o + l for o, l, _ in regions) or i == cpos or i >= len(b) - 32
stray = [i for i in range(len(b)) if orig[i] != b[i] and not inreg(i)]
code = [r for r in regions if r[0] >= 0x1a0020]
print('wrote', out, len(b), 'bytes; changed', sum(1 for p, q in zip(orig, b) if p != q), 'bytes; stray:', len(stray), '; layout immediates patched:', nlay, '; code-segment regions:', len(code), 'totalling', sum(r[1] for r in code), 'bytes')
for o, l, w in regions: print(f'  {o:#09x} +{l:<7} {w}')
