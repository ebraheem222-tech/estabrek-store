import { expect, test } from "vitest";
import { resizeFrame } from "./handles";
import { placementBox, placementPatch, resizePatch, readCanvasMode, saveCanvasMode, effectiveLook, transferPatch, scaleContentsPatch, scaleContentsLimits, readScaleContents, saveScaleContents } from "./canvasManipulation";
const node = { id: "image", type: "image", props: {}, style: { base: { width: "100%" } } };
const holder = { x: 100, y: 200, w: 600, h: 400 };
test("free group scaling preserves an auto-width group's original insets", () => {
 const group={...node,type:"stack",style:{base:{layer:{x:20,y:20,anchor:"top-start"}}}};
 const patch=scaleContentsPatch(group,"base",{x:100,y:120,w:400,h:184},{x:100,y:120,w:500,h:230},{w:400,h:184},1.25,1)!;
 expect(patch).not.toHaveProperty("layer"); expect(patch).toMatchObject({scale:1.25,moveX:50,moveY:23});
});
test("group limits account for translation room, scale, own rotation and resize handle", () => {
 const group={...node,type:"stack",style:{base:{moveX:900}}};
 expect(scaleContentsLimits(group,"base",{w:800,h:400},"e")).toEqual({min:.1,max:1.25});
 expect(scaleContentsLimits(group,"base",{w:800,h:400},"w")).toEqual({min:.75,max:4});
 const rotated={...group,style:{base:{rotateZ:90,moveY:900}}};
 expect(scaleContentsLimits(rotated,"base",{w:800,h:400},"e").max).toBeCloseTo(1.25);
});
test("group scaling never silently clamps movement and shifts the opposite edge", () => {
 expect(scaleContentsPatch(node,"base",{x:100,y:100,w:800,h:400},{x:100,y:100,w:3200,h:1600},{w:800,h:400},4,1)).toBeNull();
});
test("full scale precision at the analytic movement boundary still commits the bounded resize", () => {
 const group={...node,type:"stack",style:{base:{scale:1,origin:"top",moveY:-900}}};
 const start={x:100,y:100,w:800,h:428};
 const limits=scaleContentsLimits(group,"base",{w:800,h:428},"n");
 const drag=resizeFrame(start,{w:800,h:428,rotation:0},"n",0,-500,true,8,limits);
 const patch=scaleContentsPatch(group,"base",start,drag.box,{w:800,h:428},drag.current.w/800,1)!;
 expect(patch).not.toBeNull(); expect(patch).toMatchObject({moveY:-1000}); expect(patch.scale).toBeCloseTo(limits.max,12);
});
test("content scaling is opt-in and an explicit preference survives reopening", () => {
 localStorage.removeItem("studio-scale-contents"); expect(readScaleContents()).toBe(false);
 saveScaleContents(false); expect(readScaleContents()).toBe(false);
 saveScaleContents(true); expect(readScaleContents()).toBe(true);
});
test("scaling a group changes its parent scale and placement while leaving its entire subtree untouched", () => {
 const group={...node,type:"stack",style:{base:{scale:1}},children:[{...node,id:"child",children:[{...node,id:"grandchild"}]}]};
 const before=JSON.stringify(group);
 const patch=scaleContentsPatch(group,"base",{x:100,y:200,w:200,h:100},{x:50,y:200,w:250,h:125},{w:200,h:100},1.25,1)!;
 expect(patch).toMatchObject({scale:1.25,moveX:-25,moveY:12.5});
 expect(JSON.stringify(group)).toBe(before);
});
test("shrinking a group respects ancestor scale, preview zoom and its authored top origin", () => {
 const group={...node,type:"stack",style:{base:{scale:2,origin:"top"}}};
 expect(scaleContentsPatch(group,"base",{x:200,y:200,w:200,h:100},{x:200,y:200,w:100,h:50},{w:50,h:25},.5,.5,2)).toMatchObject({scale:1,moveX:-50,moveY:0});
});
test("flow-mode group scaling compensates a bottom origin without rewriting descendant layout", () => {
 const group={...node,type:"stack",style:{base:{origin:"bottom"}}};
 expect(scaleContentsPatch(group,"base",{x:100,y:200,w:200,h:100},{x:100,y:200,w:400,h:200},{w:200,h:100},2,1)).toMatchObject({scale:2,moveX:100,moveY:100});
});
test("group scaling keeps the opposite edge when an RTL anchor reaches its holder boundary", () => {
 const group={...node,type:"stack",style:{base:{scale:1.375,origin:"top",layer:{x:0,y:2.7,anchor:"top-start"}}}};
 const patch=scaleContentsPatch(group,"base",{x:246.8,y:179.3,w:1100,h:588.5},{x:326.8,y:179.3,w:1020,h:545.7},{w:800,h:428},1020/1100,1)!;
 expect(patch).toMatchObject({scale:1.275,moveX:40,moveY:0}); expect(patch).not.toHaveProperty("layer");
});
test("scaling preserves intrinsic and percentage dimension semantics in both flow and free containers", () => {
 const group={...node,type:"stack",style:{base:{width:"100%",height:"auto"}},children:[{...node,id:"percentage-child",style:{base:{height:"100%"}}}]};
 for(const free of [false,true]) {
  const subject=free?{...group,style:{base:{...group.style.base,layer:{x:20,y:20,anchor:"top-start"}}}}:group;
  const patch=scaleContentsPatch(subject,"base",{x:100,y:200,w:400,h:184},{x:100,y:200,w:500,h:230},{w:400,h:184},1.25,1)!;
  expect(patch).not.toHaveProperty("width"); expect(patch).not.toHaveProperty("height"); expect(patch).not.toHaveProperty("maxWidth");
  expect(patch.scale).toBe(1.25);
 }
});
test("group scaling uses the active responsive scale and rejects out-of-range or invalid ratios", () => {
 const group={...node,type:"stack",style:{base:{scale:1},tablet:{scale:2},mobile:{scale:4}}};
 const b={x:100,y:200,w:200,h:100};
  expect(scaleContentsPatch(group,"tablet",b,{...b,w:300,h:150},{w:100,h:50},1.5,1)).toMatchObject({scale:3});
 for(const ratio of [0,NaN,Infinity,3]) expect(scaleContentsPatch(group,"tablet",b,b,{w:100,h:50},ratio,1)).toBeNull();
});
test("cross-scale reparenting keeps raw dimensions and compensates the entire subtree's scale", () => {
 const container={...node,type:"stack",style:{base:{scale:1.1,origin:"top"}},children:[{...node,id:"child"}]};
 const patch=transferPatch(container,"base",{x:220,y:260,w:247.5,h:165},holder,{w:180,h:120},1,false,1.25,1)!;
 expect(patch).toMatchObject({scale:1.375,width:"180px",height:"120px",layer:{anchor:"top-start",x:25.6,y:15}});
 expect(transferPatch(container,"base",{x:220,y:260,w:247.5,h:165},holder,{w:180,h:120},1,false,4,.1)).toBeNull();
});
test("free movement is the default and the flow choice is retained", () => {
 localStorage.removeItem("studio-canvas-placement");expect(readCanvasMode()).toBe("free");saveCanvasMode("flow");expect(readCanvasMode()).toBe("flow");localStorage.setItem("studio-canvas-placement","unknown");expect(readCanvasMode()).toBe("free");
});
test("normal flow becomes a measured free object at the same visual position with zoom and RTL", () => {
 const box={x:220,y:260,w:180,h:100},size={w:180,h:100};
 expect(placementPatch(node,"base",box,holder,size,.5,false,true)).toMatchObject({width:"360px",height:"200px",maxWidth:"360px",layer:{x:20,y:15,anchor:"top-start"}});
 expect(placementPatch(node,"base",box,holder,size,.5,true,true)?.layer).toMatchObject({x:50,y:15,anchor:"top-start"});
 expect(placementPatch(node,"base",box,{...holder,w:0},size,.5,false,true)).toBeNull();
});
test("a placed object retains its anchor and authored translation when crossing containers", () => {
 const placed={...node,style:{base:{layer:{x:10,y:10,anchor:"center"},moveX:10,moveY:-4}}};
 const patch=placementPatch(placed,"base",{x:220,y:260,w:180,h:100},holder,{w:180,h:100},.5,false,false)!;
 expect(patch.layer).toEqual({anchor:"center",x:34.2,y:28});expect(patch).not.toHaveProperty("width");
});
test("resizing from the west preserves the opposite edge as one size and placement patch", () => {
 const start={x:220,y:260,w:180,h:100},next={x:200,y:260,w:200,h:100};
 const patch=resizePatch(node,"base",start,next,{w:180,h:100},400,null,holder,.5,false,true)!;
 expect(patch).toMatchObject({width:"400px",height:"200px",layer:{x:16.7,y:15,anchor:"top-start"}});
});
test("a rotated resize uses the rendered centre and the quantized local size", () => {
 const n={...node,style:{base:{layer:{x:50,y:50,anchor:"center"},rotateZ:90}}};
 const patch=resizePatch(n,"base",{x:220,y:260,w:100,h:180},{x:220,y:240,w:100,h:200},{w:180,h:100},200,100,holder,1,false,true)!;
 expect(patch).toMatchObject({width:"200px",height:"100px",layer:{anchor:"center",x:28.3,y:35}});
});
test("responsive preview merges only the active screen's inheritance chain",()=>{
 const n={...node,style:{base:{width:"400px",color:"text"},tablet:{width:"300px"},mobile:{width:"200px"}}};
 expect(effectiveLook(n,"tablet")).toEqual({width:"300px",color:"text"});expect(effectiveLook(n,"mobile").width).toBe("200px");
});
test("an explicit container height releases an old minimum that would block shrinking",()=>{
 const container={...node,type:"stack",style:{base:{minHeight:"240px"}}};
 const patch=resizePatch(container,"base",{x:120,y:220,w:200,h:240},{x:120,y:220,w:200,h:80},{w:200,h:240},200,80,holder,1,false,true)!;
 expect(patch).toMatchObject({height:"80px",minHeight:"0px"});
});

test("ancestor scale changes the layout box without changing raw CSS dimensions", () => {
 const size={w:100,h:50},rendered={x:220,y:260,w:150,h:75};
 expect(placementPatch(node,"base",rendered,holder,size,.5,false,true,1.5)).toMatchObject({width:"200px",height:"100px",layer:{x:20,y:15}});
 expect(placementBox(node,"base",rendered,size,.5,1.5)).toEqual(rendered);
});

test.each([
 {origin:"top",rendered:{x:400,y:200,w:200,h:400}},
 {origin:"bottom",rendered:{x:600,y:300,w:200,h:400}},
])("placement removes own scale and rotation about $origin under an ancestor scale", ({origin,rendered}) => {
 const transformed={...node,style:{base:{origin,scale:2,rotateZ:90}}};
 const patch=placementPatch(transformed,"base",rendered,holder,{w:100,h:50},.5,false,true,2)!;
 expect(patch).toMatchObject({width:"200px",height:"100px",layer:{x:66.7,y:50,anchor:"top-start"}});
 expect(placementBox(transformed,"base",rendered,{w:100,h:50},.5,2)).toEqual({x:500,y:400,w:200,h:100});
});

test("authored translation is scaled by the ancestors when deriving placement", () => {
 const translated={...node,style:{base:{moveX:10,moveY:-4}}};
 const rendered={x:230,y:256,w:200,h:100};
 expect(placementBox(translated,"base",rendered,{w:100,h:50},.5,2)).toEqual({x:220,y:260,w:200,h:100});
});

test("reparenting between ancestor scales preserves raw CSS dimensions and the displayed centre", () => {
 const rendered={x:200,y:260,w:200,h:100},size={w:100,h:50};
 const source=placementPatch(node,"base",rendered,holder,size,.5,false,true,2)!;
 const target=placementPatch(node,"base",rendered,holder,size,.5,false,true,1.5)!;
 expect(source).toMatchObject({width:"200px",height:"100px",layer:{x:16.7,y:15}});
 expect(target).toMatchObject({width:"200px",height:"100px",layer:{x:20.8,y:18.1}});
});

test("a west resize uses raw CSS dimensions under a doubled ancestor", () => {
 const start={x:220,y:260,w:200,h:100},next={x:200,y:260,w:220,h:100};
 expect(resizePatch(node,"base",start,next,{w:100,h:50},220,null,holder,.5,false,true,2)).toMatchObject({width:"220px",height:"100px",layer:{x:16.7,y:15}});
});

test("flow resize compensates a changing top transform origin and ancestor scale", () => {
 const transformed={...node,style:{base:{origin:"top",scale:2,rotateZ:90}}};
 const start={x:200,y:50,w:200,h:400},next={x:180,y:10,w:240,h:440};
 expect(resizePatch(transformed,"base",start,next,{w:100,h:50},220,120,null,.5,false,false,2)).toMatchObject({width:"220px",height:"120px",moveX:10,moveY:-20});
});
