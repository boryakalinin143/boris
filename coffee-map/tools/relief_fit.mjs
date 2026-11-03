import {geoNaturalEarth1, geoPath} from "d3-geo";
import {feature} from "topojson-client";
import fs from "fs";
const W=JSON.parse(fs.readFileSync("/home/user/boris/coffee-map/data/world.json"));
const O=JSON.parse(fs.readFileSync("/home/user/boris/coffee-map/data/origins.json"));
const ids=new Set(O.countries.map(c=>c.iso).filter(Boolean));
const proj=geoNaturalEarth1().fitExtent([[8,8],[952,492]],{type:"Sphere"});
const path=geoPath(proj);
const feats=feature(W,W.objects.countries).features.filter(f=>ids.has(f.id));
let b=[[1e9,1e9],[-1e9,-1e9]];
const polys=[];
for(const f of feats){const bb=path.bounds(f); b[0][0]=Math.min(b[0][0],bb[0][0]);b[0][1]=Math.min(b[0][1],bb[0][1]);b[1][0]=Math.max(b[1][0],bb[1][0]);b[1][1]=Math.max(b[1][1],bb[1][1]);
  const geom=f.geometry; const P=geom.type==="Polygon"?[geom.coordinates]:geom.coordinates;
  for(const poly of P) polys.push(poly.map(ring=>ring.map(pt=>proj(pt))));
}
fs.writeFileSync("fit.json",JSON.stringify({scale:proj.scale(),translate:proj.translate(),bounds:b,polys}));
console.log(proj.scale(),proj.translate(),b);
