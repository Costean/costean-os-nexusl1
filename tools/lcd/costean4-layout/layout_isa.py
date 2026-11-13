# NexusL1 v1.0.4.4 SquareLine UI init: per-label layout immediates (Xtensa movi / movi.n writing a11 right before
# call8 lv_obj_set_x / lv_obj_set_y / lv_obj_set_align), and the per-screen text-colour register loads.
# Addresses found by disassembling UI::init screens (MiningScreen 0x4202ab94, Settings 0x4202b04c, BTC 0x4202b4ec,
# GlobalStats 0x4202b680) and matching 1:1 against the upstream NerdQAxe SquareLine ui.cpp label order.
import struct
IROM_VA, IROM_OFF = 0x42000020, 0x1a0020   # IROM segment load addr / file offset (app image)
SET_X, SET_Y, SET_AL = 0x42042870, 0x4204289c, 0x42042a18
# name: (x_insn, y_insn, align_insn)
L = {
 'lbConnect':(0x4202aa88,0x4202aa90,0x4202aa97), 'lbSSID':(0x4202ab34,0x4202ab3b,0x4202ab42),
 'lbVinput':(0x4202abec,0x4202abf4,0x4202abfc), 'lbVcore':(0x4202ac4b,0x4202ac53,0x4202ac5a),
 'lbIntensidad':(0x4202aca3,0x4202acab,0x4202acb2), 'lbPower':(0x4202acf9,0x4202ad01,0x4202ad08),
 'lbEficiency':(0x4202ad4f,0x4202ad57,0x4202ad5e), 'lbTemp':(0x4202ada8,0x4202adb0,0x4202adb7),
 'lbTime':(0x4202ae02,0x4202ae0b,0x4202ae13), 'lbIP':(0x4202ae64,0x4202ae6c,0x4202ae75),
 'lbBestDifficulty':(0x4202aec5,0x4202aecd,0x4202aed5), 'lbHashrate':(0x4202af24,0x4202af2d,0x4202af35),
 'lbRPM':(0x4202af84,0x4202af8c,0x4202af94), 'lbASIC':(0x4202afe4,0x4202afed,0x4202aff6),
 'lbIPSet':(0x4202b0ac,0x4202b0b4,0x4202b0bd), 'lbBestDifficultySet':(0x4202b10f,0x4202b117,0x4202b11f),
 'lbPoolNr':(0x4202b171,0x4202b17a,0x4202b183), 'lbVcoreSet':(0x4202b1d2,0x4202b1da,0x4202b1e3),
 'lbFreqSet':(0x4202b235,0x4202b23d,0x4202b245), 'lbFanSet':(0x4202b294,0x4202b29c,0x4202b2a4),
 'lbPoolSet':(0x4202b2f3,0x4202b2fc,0x4202b304), 'lbHashrateSet':(0x4202b354,0x4202b35d,0x4202b365),
 'lbShares':(0x4202b3b5,0x4202b3bd,0x4202b3c5), 'lbPortSet':(0x4202b414,0x4202b41d,0x4202b426),
 'lblBTCPrice':(0x4202b566,0x4202b56e,0x4202b576), 'lblHashPrice':(0x4202b5bd,0x4202b5c6,0x4202b5cf),
 'lblTempPrice':(0x4202b620,0x4202b629,0x4202b632), 'lblHalvingPercent':(0x4202b6e3,0x4202b6ec,0x4202b6f4),
 'lblBlock':(0x4202b748,0x4202b751,0x4202b759), 'lblBlocksToHalving':(0x4202b7ae,0x4202b7b7,0x4202b7bf),
 'lblDifficulty':(0x4202b80f,0x4202b818,0x4202b820), 'lblGlobalHash':(0x4202b870,0x4202b879,0x4202b881),
 'lbllowFee':(0x4202b8d1,0x4202b8d9,0x4202b8e2), 'lblmedFee':(0x4202b937,0x4202b93f,0x4202b948),
 'lblhighFee':(0x4202b998,0x4202b9a1,0x4202b9aa),
}
# colour register loads (movi.n aR, imm) and the labels whose text colour (and, BTC: screen bg) they feed
COLREG = {
 'mining':  (0x4202ad6d, 5, ['lbEficiency','lbIP','lbBestDifficulty','lbHashrate','lbRPM','lbASIC'], None),
 'settings':(0x4202b0ce, 4, ['lbIPSet','lbBestDifficultySet','lbHashrateSet','lbShares'], None),
 'btc':     (0x4202b4fc, 6, ['lblHashPrice','lblTempPrice'], 'ui_BTCScreen'),
 'global':  (0x4202b76a, 5, ['lblBlock','lblGlobalHash'], None),
}
def off(va): return va - IROM_VA + IROM_OFF
def dec(b, va, reg=11):
    o = off(va); b0, b1 = b[o], b[o+1]
    if b0 & 0xf == 0xc and (b1 & 0xf) == reg:          # movi.n
        imm = ((b0 >> 4) & 7) << 4 | (b1 >> 4); imm = imm - 128 if (imm & 0x60) == 0x60 else imm
        return 'movi.n', imm
    if b0 == (reg << 4) | 2 and (b1 & 0xf0) == 0xa0:   # movi
        imm = (b1 & 0xf) << 8 | b[o+2]; imm = imm - 4096 if imm & 0x800 else imm
        return 'movi', imm
    raise ValueError(f'unexpected insn at {va:#x}: {b[o:o+3].hex()}')
def enc(kind, imm, reg=11):
    if kind == 'movi.n':
        if not -32 <= imm <= 95: raise ValueError(f'{imm} does not fit movi.n (-32..95)')
        v = imm & 0x7f; return bytes([((v >> 4) << 4) | 0xc, ((v & 0xf) << 4) | reg])
    if not -2048 <= imm <= 2047: raise ValueError(f'{imm} does not fit movi')
    v = imm & 0xfff; return bytes([(reg << 4) | 2, 0xa0 | (v >> 8), v & 0xff])
def call_target(b, va):
    o = off(va); w = b[o] | b[o+1] << 8 | b[o+2] << 16
    assert w & 0x3f == 0x25, f'not call8 at {va:#x}'          # op0=5, n=2 (call8)
    imm = w >> 6; imm = imm - (1 << 18) if imm & (1 << 17) else imm
    return (va & ~3) + (imm << 2) + 4
def ilen(b, va):
    op0 = b[off(va)] & 0xf
    return 2 if op0 >= 8 and op0 <= 13 else 3
def next_call(b, va):
    # verified shape: <a11 write> ; l32i(.n) a10, a2, N ; call8 fn
    p = va + ilen(b, va); o = off(p)
    assert (b[o] & 0xf) in (8, 2) and (b[o] >> 4) == 0xa, f'expected l32i a10 at {p:#x}'
    p += ilen(b, p)
    return p, call_target(b, p)
def read_layout(b):
    out = {}
    for n, (xa, ya, aa) in L.items():
        r = {}
        for k, a, fn in (('x', xa, SET_X), ('y', ya, SET_Y), ('al', aa, SET_AL)):
            kind, v = dec(b, a); ca, tgt = next_call(b, a)
            assert tgt == fn, (n, k, hex(a), hex(tgt)); r[k] = v; r[k + '_kind'] = kind
        out[n] = r
    cols = {}
    for s, (a, reg, labs, bg) in COLREG.items():
        kind, v = dec(b, a, reg); assert kind == 'movi.n'; cols[s] = (v & 0xffff, labs, bg)
    return out, cols

# literal-pool colour words (32-bit, read only by the listed l32r; verified by a byte-level scan of IROM for l32r targets)
LITCOL = {'lbTime': (0x42002ed8, 0x60df, 0x4202ae26)}
def read_litcols(b):
    return {n: struct.unpack_from('<I', b, off(va))[0] & 0xffff for n, (va, stock, user) in LITCOL.items()}
