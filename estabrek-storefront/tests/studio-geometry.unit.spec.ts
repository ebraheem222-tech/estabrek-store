import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { measurePlane, paddingPlane,nodeGeometry } from "../src/pageTree/studioGeometry";

const require=createRequire(import.meta.url);
function scene(run:(win:any)=>void) {
  const {JSDOM}=require("../../estabrek-admin/node_modules/jsdom");
  const dom=new JSDOM('<div id="parent"><div id="child"></div></div>');
  const previous=new Map<string,PropertyDescriptor|undefined>();
  const globals={window:dom.window,document:dom.window.document,getComputedStyle:dom.window.getComputedStyle.bind(dom.window)};
  for(const [key,value] of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
  try{run(dom.window);}finally{for(const [key,value]of previous){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}dom.window.close();}
}
function rect(el:any,x:number,y:number,w:number,h:number){el.getBoundingClientRect=()=>({x,y,left:x,top:y,right:x+w,bottom:y+h,width:w,height:h});}
function dims(el:any,w:number,h:number){el.style.width=`${w}px`;el.style.height=`${h}px`;el.style.boxSizing="border-box";Object.defineProperty(el,"offsetWidth",{value:w,configurable:true});Object.defineProperty(el,"offsetHeight",{value:h,configurable:true});}

test("measured local axes include rotated nonuniform ancestors without deriving dimensions from an AABB",()=>scene(win=>{
  const parent=win.document.querySelector('#parent'),el=win.document.querySelector('#child');
  parent.style.transform="matrix(0,2,-3,0,0,0)";dims(el,100,50);rect(el,50,80,150,200);
  const plane=measurePlane(el)!;
  expect(plane.w).toBe(100);expect(plane.h).toBe(50);
  expect(plane.quad).toEqual([{x:200,y:80},{x:200,y:280},{x:50,y:280},{x:50,y:80}]);
  expect(plane.kind).toBe("affine");expect(plane.matrix4).toHaveLength(16);
}));

test("45 degree boxes keep measured local dimensions and fractional CSS pixels",()=>scene(win=>{
  const el=win.document.querySelector('#child'),c=Math.SQRT1_2;
  dims(el,100,50);el.style.width="100.25px";el.style.transform=`matrix(${c},${c},${-c},${c},0,0)`;
  rect(el,10,20,(100.25+50)*c,(100.25+50)*c);
  const plane=measurePlane(el)!;expect(plane.w).toBe(100.25);expect(plane.h).toBe(50);
  expect(plane.quad[1].x-plane.quad[0].x).toBeCloseTo(100.25*c,8);
}));

test("padding frames use local border insets even under rotated scale",()=>scene(win=>{
  const el=win.document.querySelector('#child');dims(el,220,120);el.style.transform="matrix(0,2,-2,0,0,0)";rect(el,20,30,240,440);
  for(const [key,value]of Object.entries({clientLeft:10,clientTop:10,clientWidth:200,clientHeight:100}))Object.defineProperty(el,key,{value});
  const plane=paddingPlane(el)!;expect(plane.w).toBe(200);expect(plane.h).toBe(100);
  expect(plane.quad).toEqual([{x:240,y:50},{x:240,y:450},{x:40,y:450},{x:40,y:50}]);
}));

test("a planar perspective transform produces a projective frame and rejects edge-on or preserve-3d contexts",()=>scene(win=>{
  const el=win.document.querySelector('#child');dims(el,100,50);
  el.style.transform="matrix3d(1,0,0,0.002,0,1,0,0,0,0,1,0,0,0,0,1)";
  // CSS transform origin is top-left so the calibrated trapezoid is unambiguous.
  el.style.transformOrigin="0px 0px";rect(el,30,40,100/1.2,50);
  expect(measurePlane(el)?.kind).toBe("projective");
  el.style.transform="matrix(0,0,0,1,0,0)";expect(measurePlane(el)).toBeNull();
  el.style.transform="none";el.parentElement.style.transformStyle="preserve-3d";expect(measurePlane(el)).toBeNull();
}));

test("unmodelled CSS zoom and inconsistent bounds refuse a frame instead of guessing",()=>scene(win=>{
  const el=win.document.querySelector('#child');dims(el,100,50);rect(el,0,0,200,100);el.parentElement.style.setProperty("zoom","2");expect(measurePlane(el)).toBeNull();
  el.parentElement.style.removeProperty("zoom");expect(measurePlane(el)).toBeNull();
}));

test("the CMS perspective term stays affine on an ancestor's flattened XY plane",()=>scene(win=>{
 const parent=win.document.querySelector('#parent'),el=win.document.querySelector('#child');
 parent.style.transform="matrix3d(0,2,0,0,-3,0,0,0,0,0,1,-0.001,0,0,0,1)";dims(el,100,50);rect(el,50,80,150,200);
 expect(measurePlane(el)?.quad).toEqual([{x:200,y:80},{x:200,y:280},{x:50,y:280},{x:50,y:80}]);
}));

test("scrolling shifts the layout holder's origin while its clipping viewport stays fixed",()=>scene(win=>{
 const parent=win.document.querySelector('#parent'),el=win.document.querySelector('#child');dims(parent,600,400);dims(el,100,50);rect(parent,10,20,600,400);rect(el,10,10,100,50);parent.style.overflow="auto";parent.style.position="relative";parent.scrollTop=50;el.style.position="absolute";
 Object.defineProperty(el,"offsetParent",{value:parent});Object.defineProperty(parent,"clientWidth",{value:600});Object.defineProperty(parent,"clientHeight",{value:400});
 const geometry=nodeGeometry(el,new Map());expect(geometry.holderPlane?.quad[0]).toEqual({x:10,y:-30});expect(geometry.clips?.[0][0]).toEqual({x:10,y:20});
}));

test("the root viewport clips in scrolled document coordinates rather than at document zero",()=>scene(win=>{
 const el=win.document.querySelector('#child');dims(el,100,50);rect(el,10,20,100,50);win.document.documentElement.style.overflow="hidden";Object.defineProperty(win,"scrollY",{value:100});
 const geometry=nodeGeometry(el,new Map());expect(geometry.clips?.at(-1)?.[0]).toEqual({x:0,y:100});
}));
