/** Studio-only plane measurements. Local CSS border boxes map to iframe document pixels. */
import { boundsOfQuad, embedPlane, isAffineXY, inverse3, multiply3, planeQuad, type Mat3, type Mat4, type Plane, type Point } from "../../../shared/geometry/plane";

export type MeasuredPlane = Plane & { quad: Point[]; matrix4: Mat4; kind: "affine" | "projective" };
export type NodeGeometry = { plane?: MeasuredPlane; parentPlane?: MeasuredPlane; inline?: boolean; partMoveSafe?: boolean; holderPlane?: MeasuredPlane; innerPlane?: MeasuredPlane; holderScroll?:Point;clips?: Point[][]; unsupported?: boolean };
const ID: Mat3 = [1,0,0,0,1,0,0,0,1];
const shift = (x:number,y:number):Mat3 => [1,0,x,0,1,y,0,0,1];
const number = (value:string|null|undefined) => Number.parseFloat(value || "") || 0;

/** A length the browser computed (px, %, or calc() of them) in px, its % of `size`; null when it's something else. */
export function cssLength(text:string,size:number):number|null {
  const v=text.trim();
  const inner=/^calc\((.*)\)$/.exec(v)?.[1]??v;
  const terms=inner.replace(/\s+/g,"").match(/[+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?(px|%)?/gi);
  if(!terms||terms.join("")!==inner.replace(/\s+/g,""))return null;
  return terms.reduce((sum,t)=>sum+(t.endsWith("%")?Number.parseFloat(t)*size/100:Number.parseFloat(t)),0);
}

/** Rows of 4×4 matrices multiplied (a then b applied to points: a·b). */
function mul4(a:Mat4,b:Mat4):Mat4{
  const out=new Array(16).fill(0) as unknown as Mat4;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){let v=0;for(let k=0;k<4;k++)v+=a[r*4+k]*b[k*4+c];(out as unknown as number[])[r*4+c]=v;}
  return out;
}

/**
 * Its own `translate`, `rotate` and `scale` (the separate properties: a ring's things, a sideways row, a
 * held section shrinking back) as one matrix, applied before its `transform` as the browser does; null
 * when one goes into depth (a 3D turn or a Z move), which needs another way of measuring.
 */
function separate(el:Element,cs:CSSStyleDeclaration):Mat4|null {
  const I:Mat4=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  let m=I;
  const t=cs.getPropertyValue("translate").trim(),r=cs.getPropertyValue("rotate").trim(),sc=cs.getPropertyValue("scale").trim();
  if(t&&t!=="none"){
    const box=el as HTMLElement,w=box.offsetWidth||0,h=box.offsetHeight||0;
    const parts=t.match(/calc\([^()]*(\([^()]*\)[^()]*)*\)|[^\s]+/g)??[];
    const x=cssLength(parts[0]??"0",w),y=cssLength(parts[1]??"0",h),z=parts[2]?cssLength(parts[2],0):0;
    if(x===null||y===null||z===null||Math.abs(z)>1e-6)return null;
    m=mul4(m,[1,0,0,x,0,1,0,y,0,0,1,0,0,0,0,1]);
  }
  if(r&&r!=="none"){
    const turn=/^(?:z\s+|0\s+0\s+1\s+)?(-?[\d.]+(?:e[+-]?\d+)?)(deg|rad|turn|grad)$/i.exec(r);
    if(!turn)return null;
    const n=Number.parseFloat(turn[1]),unit=turn[2].toLowerCase();
    const a=unit==="rad"?n:unit==="turn"?n*2*Math.PI:unit==="grad"?n*Math.PI/200:n*Math.PI/180;
    const c=Math.cos(a),s=Math.sin(a);
    m=mul4(m,[c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1]);
  }
  if(sc&&sc!=="none"){
    const k=sc.split(/\s+/).map(v=>v.endsWith("%")?Number.parseFloat(v)/100:Number.parseFloat(v));
    if(!k.length||k.some(v=>!Number.isFinite(v)))return null;
    const sx=k[0],sy=k[1]??k[0];
    if(k.length>2&&Math.abs(k[2]-1)>1e-6)return null;
    m=mul4(m,[sx,0,0,0,0,sy,0,0,0,0,1,0,0,0,0,1]);
  }
  return m;
}

function transform(el:Element):Mat4|null {
  const cs=getComputedStyle(el), text=cs.transform;
  // Zoom, preserve-3d and perspective need a different composition contract.
  const zoom=cs.getPropertyValue("zoom");
  if (zoom && zoom!=="normal" && Number(zoom)!==1 || cs.transformStyle==="preserve-3d" || cs.perspective && cs.perspective!=="none") return null;
  const before=separate(el,cs);if(!before)return null;
  let own:Mat4;
  if(!text || text==="none")own=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  else{
    const match=/^matrix(3d)?\(([^)]+)\)$/.exec(text), values=match?.[2].split(",").map(Number);
    if(!values?.every(Number.isFinite))return null;
    if(match?.[1] && values.length===16)own=values.map((_,i)=>values[(i%4)*4+Math.floor(i/4)]) as unknown as Mat4;
    else if(!match?.[1] && values.length===6){const[a,b,c,d,e,f]=values;own=[a,c,0,e,b,d,0,f,0,0,1,0,0,0,0,1];}
    else return null;
  }
  return mul4(before,own);
}

function sizeOf(el:HTMLElement) {
  const cs=getComputedStyle(el), extra=(axis:"x"|"y")=>axis==="x" ? number(cs.paddingLeft)+number(cs.paddingRight)+number(cs.borderLeftWidth)+number(cs.borderRightWidth) : number(cs.paddingTop)+number(cs.paddingBottom)+number(cs.borderTopWidth)+number(cs.borderBottomWidth);
  const w=number(cs.width),h=number(cs.height);
  return {w:w>0?w+(cs.boxSizing==="border-box"?0:extra("x")):el.offsetWidth,h:h>0?h+(cs.boxSizing==="border-box"?0:extra("y")):el.offsetHeight};
}

function ownPlane(el:HTMLElement,w:number,h:number):Mat3|null {
  const m=transform(el);if(!m)return null;
  const values=getComputedStyle(el).transformOrigin.split(/\s+/);
  const coordinate=(text:string|undefined,size:number)=>text?text.endsWith("%")?number(text)*size/100:number(text):size/2;
  // A nonzero Z transform origin is outside the authored CMS style contract.
  if(number(values[2]))return null;
  const o={x:coordinate(values[0],w),y:coordinate(values[1],h)};
  const plane:Mat3=[m[0],m[1],m[3],m[4],m[5],m[7],m[12],m[13],m[15]];
  return multiply3(shift(o.x,o.y),multiply3(plane,shift(-o.x,-o.y)));
}

function affineParents(el:Element|null):Mat3|null {
  if(!el)return ID;
  const m=transform(el),parent=affineParents(el.parentElement);
  if(!m||!parent || [m[12],m[13]].some(v=>Math.abs(v)>1e-10) || !(m[15]>1e-10))return null;
  // Each supported ancestor flattens its children. Z-only perspective terms
  // are inert on that XY plane, even when computedStyle uses matrix3d.
  return multiply3(parent,[m[0]/m[15],m[1]/m[15],0,m[4]/m[15],m[5]/m[15],0,0,0,1]);
}

function measured(matrix:Mat3,w:number,h:number):MeasuredPlane|null {
  if(!(w>0&&h>0)||!inverse3(matrix))return null;
  const quad=planeQuad(matrix,{w,h});if(!quad)return null;
  return {matrix,w,h,quad,matrix4:embedPlane(matrix),kind:Math.abs(matrix[6])+Math.abs(matrix[7])<1e-10?"affine":"projective"};
}

export function measurePlane(el:HTMLElement,cache=new Map<Element,MeasuredPlane|null>()):MeasuredPlane|null {
  if(cache.has(el))return cache.get(el)!;
  cache.set(el,null);
  const {w,h}=sizeOf(el),own=ownPlane(el,w,h);if(!own)return null;
  // Refuse unsupported 3D composition even when its current bounding box looks planar.
  for(let at:Element|null=el;at;at=at.parentElement)if(!transform(at))return null;
  const rect=el.getBoundingClientRect(), actual={x:rect.left+window.scrollX,y:rect.top+window.scrollY,w:rect.width,h:rect.height};
  const linear=affineParents(el.parentElement);
  let matrix:Mat3;
  if(linear){
    const raw=multiply3(linear,own),quad=planeQuad(raw,{w,h}),bounds=quad&&boundsOfQuad(quad);if(!bounds || Math.max(Math.abs(bounds.w-actual.w),Math.abs(bounds.h-actual.h))>1)return null;
    matrix=multiply3(shift(actual.x-bounds.x,actual.y-bounds.y),raw);
  }else{
    // Under a projected flat holder, offsets locate the element before its own
    // transform. Measured parent planes account for flattening at each boundary.
    const parent=el.offsetParent as HTMLElement|null;
    if(!parent||parent===el)return null;
    const parentPlane=measurePlane(parent,cache);if(!parentPlane)return null;
    let sx=parent.scrollLeft,sy=parent.scrollTop;
    for(let at=el.parentElement;at&&at!==parent;at=at.parentElement){sx+=at.scrollLeft;sy+=at.scrollTop;}
    matrix=multiply3(parentPlane.matrix,multiply3(shift(el.offsetLeft+parent.clientLeft-sx,el.offsetTop+parent.clientTop-sy),own));
    const quad=planeQuad(matrix,{w,h}),bounds=quad&&boundsOfQuad(quad);
    if(!bounds || Math.max(...(["x","y","w","h"] as const).map(key=>Math.abs(bounds[key]-actual[key])))>1)return null;
  }
  const result=measured(matrix,w,h);cache.set(el,result);return result;
}

export function paddingPlane(el:HTMLElement,cache=new Map<Element,MeasuredPlane|null>()):MeasuredPlane|null {
  const plane=measurePlane(el,cache);if(!plane)return null;
  return measured(multiply3(plane.matrix,shift(el.clientLeft,el.clientTop)),el.clientWidth,el.clientHeight);
}

function layoutPlane(el:HTMLElement,cache:Map<Element,MeasuredPlane|null>):MeasuredPlane|null {
  const viewport=paddingPlane(el,cache);return viewport?measured(multiply3(viewport.matrix,shift(-el.scrollLeft,-el.scrollTop)),viewport.w,viewport.h):null;
}

export function nodeGeometry(el:HTMLElement,cache:Map<Element,MeasuredPlane|null>):NodeGeometry {
  const plane=measurePlane(el,cache);if(!plane)return {unsupported:true};
  const holder=getComputedStyle(el).position==="absolute"?el.offsetParent as HTMLElement|null:el.parentElement?.closest<HTMLElement>(".pt-inner,.pt-stack,.pt-grid,.pt-cell,.pt-popup,.pt-columns,.pt-section")??null;
  const inner=el.matches(".pt-section,.pt-stack,.pt-grid,.pt-cell,.pt-popup,.pt-columns")?(el.matches(".pt-section")?el.querySelector<HTMLElement>(":scope > .pt-inner")??el:el):null;
  const holderFrame=holder?layoutPlane(holder,cache):null,innerFrame=inner?layoutPlane(inner,cache):null;
  const clips:Point[][]=[];
  for(let at=el.parentElement;at;at=at.parentElement){
    const cs=getComputedStyle(at);
    if([cs.overflowX,cs.overflowY,cs.overflow].some(value=>/^(hidden|clip|auto|scroll)$/.test(value))){
      if(at===document.documentElement){const x=window.scrollX,y=window.scrollY;clips.push([{x,y},{x:x+window.innerWidth,y},{x:x+window.innerWidth,y:y+window.innerHeight},{x,y:y+window.innerHeight}]);}
      else{const frame=paddingPlane(at,cache);if(frame)clips.push(frame.quad);}
    }
  }
  const parentFrame = el.parentElement ? measurePlane(el.parentElement, cache) : null;
  const own = transform(el);
  return {plane, inline: getComputedStyle(el).display === "inline", partMoveSafe: Boolean(own && isAffineXY(own)),...(parentFrame ? {parentPlane: parentFrame} : {}),...(holderFrame?{holderPlane:holderFrame}:{}),...(holder?{holderScroll:{x:holder.scrollLeft,y:holder.scrollTop}}:{}),...(innerFrame?{innerPlane:innerFrame}:{}),...(clips.length?{clips}:{}),...(!holderFrame?{unsupported:true}:{})};
}
