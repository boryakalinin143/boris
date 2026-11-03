import json, os, numpy as np
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
fit=json.load(open('node/fit.json')); S=fit['scale']; T=fit['translate']
X0,Y0,WW,HH=184.0,88.0,701.0,266.0
src=np.asarray(Image.open('srhr/SR_HR.tif'))  # uint8
sh,sw=src.shape
land=src  # ref
def inv(X,Y):
    xr=(X-T[0])/S; yr=-(Y-T[1])/S
    phi=yr.copy()
    for _ in range(20):
        p2=phi*phi; p4=p2*p2
        f=phi*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))-yr
        df=1.007226+p2*(0.015085*3+p4*(-0.044475*7+0.028874*9*p2-0.005916*11*p4))
        phi-=f/df
    p2=phi*phi; p4=p2*p2
    lam=xr/(0.8707+p2*(-0.131979+p2*(-0.013791+p4*p2*(0.003971-0.001529*p2))))
    return np.degrees(lam),np.degrees(phi)
def sample(lon,lat):
    col=((lon+180)/360*sw-.5).clip(0,sw-1.001); row=((90-lat)/180*sh-.5).clip(0,sh-1.001)
    c0=col.astype(int); r0=row.astype(int); fc=col-c0; fr=row-r0
    a=src[r0,c0].astype(np.float32); b=src[r0,c0+1]; c=src[r0+1,c0]; d=src[r0+1,c0+1]
    return a*(1-fc)*(1-fr)+b*fc*(1-fr)+c*(1-fc)*fr+d*fc*fr
FLAT=204.5
TS=512
polys=fit['polys']
out={'tile':TS,'levels':{}}
for F in (10,20):
    W=int(WW*F); H=int(HH*F); nx=-(-W//TS); ny=-(-H//TS)
    os.makedirs(f'tiles/{F}',exist_ok=True)
    have=[]
    for j in range(ny):
        for i in range(nx):
            # mask
            m=Image.new('L',(TS,TS),0); d=ImageDraw.Draw(m)
            ox=X0+i*TS/F; oy=Y0+j*TS/F
            for poly in polys:
                for k,ring in enumerate(poly):
                    pts=[((p[0]-ox)*F,(p[1]-oy)*F) for p in ring]
                    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                    if max(xs)<0 or min(xs)>TS or max(ys)<0 or min(ys)>TS: continue
                    if len(pts)>2: d.polygon(pts,fill=255 if k==0 else 0)
            M=np.asarray(m)>0
            if not M.any(): continue
            xs=ox+(np.arange(TS)+.5)/F; ys=oy+(np.arange(TS)+.5)/F
            X,Y=np.meshgrid(xs,ys)
            lon,lat=inv(X,Y)
            v=sample(lon,lat)
            g=np.where(M,(128+(v-FLAT)*1.6).clip(0,255),128).astype(np.uint8)
            Image.fromarray(g,'L').save(f'tiles/{F}/{i}_{j}.jpg',quality=80,optimize=True)
            have.append([i,j])
    out['levels'][F]=have
    print(F,nx,ny,len(have))
json.dump(out,open('tiles/index.json','w'))
