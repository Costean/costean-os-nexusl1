# usage: python3 make_factory.py <stock esp-miner-factory-NexusL1-v1.0.4.4.bin> <app .bin> <www.bin> <output factory .bin>
import sys
st=open(sys.argv[1],'rb').read()
app=open(sys.argv[2],'rb').read(); www=open(sys.argv[3],'rb').read(); out=sys.argv[4]
f=bytearray(st); APP=0x10000; WWW=0x410000
stock_app=st[APP:APP+len(app)]; assert st[APP+len(app):WWW]==b'\xff'*(WWW-APP-len(app)), 'stock factory has data after app'
assert len(www)==0x300000
f[APP:APP+len(app)]=app; f[WWW:WWW+len(www)]=www
open(out,'wb').write(f)
diff=[i for i in range(0,len(f),4096) if f[i:i+4096]!=st[i:i+4096]]
print('size',len(f),'stock',len(st),'changed 4K pages',len(diff),'range',hex(diff[0]),'-',hex(diff[-1]+4096))
print('outside app/www changed:', [hex(i) for i in diff if not (APP<=i<APP+0x400000 or WWW<=i<WWW+0x300000)])
