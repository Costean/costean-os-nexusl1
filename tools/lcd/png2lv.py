# PNG -> LVGL v8 TRUE_COLOR_ALPHA (RGB565 swapped + A8) C file, and raw bytes for binary patching
import sys
from PIL import Image
def encode(path, w, h, alpha=True):
    im=Image.open(path).convert('RGBA'); assert im.size==(w,h), (path, im.size)
    out=bytearray()
    for r,g,b,a in im.getdata():
        v=((r>>3)<<11)|((g>>2)<<5)|(b>>3)
        out+=bytes([v>>8, v&255]) + (bytes([a]) if alpha else b'')
    return bytes(out)
def to_c(data, sym, w, h, alpha=True):
    lines=',\n'.join(', '.join('0x%02X'%x for x in data[i:i+16]) for i in range(0,len(data),16))
    cf='LV_IMG_CF_TRUE_COLOR_ALPHA' if alpha else 'LV_IMG_CF_TRUE_COLOR'
    return f'#include "lvgl.h"\nconst uint8_t {sym}_data[] = {{\n{lines}\n}};\nconst lv_img_dsc_t {sym} = {{ .header.always_zero = 0, .header.w = {w}, .header.h = {h}, .data_size = sizeof({sym}_data), .header.cf = {cf}, .data = {sym}_data }};\n'
if __name__=='__main__':
    p,sym,w,h=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]); a=len(sys.argv)<6
    open(sys.argv[5] if len(sys.argv)>5 and sys.argv[5].endswith('.c') else sym+'.c','w').write(to_c(encode(p,w,h,True),sym,w,h,True))
