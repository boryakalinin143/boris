import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
Image.MAX_IMAGE_PIXELS=None
fit=json.load(open('node/fit.json')); S=fit['scale']; T=fit['translate']; (x0,y0),(x1,y1)=fit['bounds']
x0,y0=np.floor(x0)-2,np.floor(y0)-2; x1,y1=np.ceil(x1)+2,np.ceil(y1)+2
F=5
W=int((x1-x0)*F); H=int((y1-y0)*F)
src=np.asarray(Image.open('sr/SR_50M.tif'),dtype=np.float32)
sh,sw=src.shape
xs=(np.arange(W)+.5)/F+x0; ys=(np.arange(H)+.5)/F+y0
X,Y=np.meshgrid(xs,ys)
xr=(X-T[0])/S; yr=-(Y-T[1])/S
# inverse Natural Earth I (d3 naturalEarth1Raw.invert)
phi=yr.copy()
for _ in range(25):
    p2=phi*phi; p4=p2*p2
    f=phi*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))-yr
    df=1.007226+p2*(0.015085*3+p4*(-0.044475*7+0.028874*9*p2-0.005916*11*p4))
    phi-=f/df
p2=phi*phi; p4=p2*p2
lam=xr/(0.8707+p2*(-0.131979+p2*(-0.013791+p4*p2*(0.003971-0.001529*p2))))
lon=np.degrees(lam); lat=np.degrees(phi)
col=((lon+180)/360*sw).clip(0,sw-1); row=((90-lat)/180*sh).clip(0,sh-1)
# bilinear
c0=np.floor(col).astype(int); r0=np.floor(row).astype(int); c1=np.minimum(c0+1,sw-1); r1=np.minimum(r0+1,sh-1)
fc=col-c0; fr=row-r0
v=(src[r0,c0]*(1-fc)*(1-fr)+src[r0,c1]*fc*(1-fr)+src[r1,c0]*(1-fc)*fr+src[r1,c1]*fc*fr)
# mask
mask=Image.new('L',(W,H),0); d=ImageDraw.Draw(mask)
for poly in fit['polys']:
    for i,ring in enumerate(poly):
        pts=[((p[0]-x0)*F,(p[1]-y0)*F) for p in ring]
        if len(pts)>2: d.polygon(pts,fill=255 if i==0 else 0)
m=np.asarray(mask)>0
flat=np.median(v[m]); print('flat',flat, v[m].min(), v[m].max())
# shade: >flat lit, <flat shadow. encode as grayscale for overlay blend: 128=neutral
g=128+(v-flat)*1.6
g=g.clip(0,255)
alpha=np.where(m,255,0).astype(np.uint8)
out=np.dstack([g,g,g]).astype(np.uint8)
img=Image.fromarray(np.dstack([out,alpha]),'RGBA')
img.save('relief.png',optimize=True)
json.dump({'x':float(x0),'y':float(y0),'w':float(x1-x0),'h':float(y1-y0),'px':[W,H]},open('relief.json','w'))
print(W,H)
