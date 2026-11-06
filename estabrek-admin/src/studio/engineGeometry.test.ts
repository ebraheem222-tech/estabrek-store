import { expect,test } from "vitest";
import { cmsTransform,multiply3,project3,type Plane,type Mat3 } from "../../../shared/geometry/plane";
import { canvasPlane,effectiveConstraints,movementOf,planeMovePatch,planeResizePatch,planeNudgePatch,planeMoveLocalPatch,validResponsiveConstraints } from "./engineGeometry";
const t=(x:number,y:number):Mat3=>[1,0,x,0,1,y,0,0,1];
const holder:Plane={w:600,h:400,matrix:[0,-3,800,2,0,50,0,0,1]};
function item(look:Record<string,unknown>={},parent=holder):Plane {return {w:100,h:50,matrix:multiply3(parent.matrix,multiply3(t(30,40),cmsTransform(look,{w:100,h:50},false)!))};}
test("canvas mapping includes pan, zoom and iframe scroll exactly once",()=>{
 const p=canvasPlane({w:100,h:50,matrix:t(200,300)},{x:20,y:100},{x:40,y:60},.5)!;
 expect(project3(p.matrix,{x:0,y:0})).toEqual({x:130,y:160});expect(p.w).toBe(100);
});
test("resizing inside a rotated nonuniform holder saves local dimensions and keeps its fixed edge",()=>{
 const frame=item(),next=planeResizePatch(frame,holder,{},"e",{x:0,y:80},{rtl:false})!;
 expect(next.w).toBeCloseTo(140,5);expect(next.h).toBeCloseTo(50,5);
 expect(next.patch.width).toBe("140px");expect(next.patch.layer).toMatchObject({x:5,y:10,anchor:"top-start"});
 const fixed=project3(next.matrix,{x:0,y:25})!,oldFixed=project3(frame.matrix,{x:0,y:25})!;expect(fixed.x).toBeCloseTo(oldFixed.x,8);expect(fixed.y).toBeCloseTo(oldFixed.y,8);
});
test("same-holder perspective movement changes parent-local layout without flattening the object's transform",()=>{
 const look={rotateY:30,rotateX:15,perspective:900},frame=item(look),grab=project3(frame.matrix,{x:50,y:25})!;
 const next=planeMovePatch(frame,holder,look,{x:20,y:10},grab,"horizontal",false,false)!;
 expect((next.patch.layer as any).y).toBeCloseTo(10,8);expect(next.patch.rotateY).toBeUndefined();
 const moved=project3(next.matrix,{x:50,y:25})!;expect(moved.x).toBeCloseTo(grab.x,6);expect(moved.y).toBeCloseTo(grab.y+10,6);
});
test("required bounds win over pointer size and keep the opposite resize point fixed",()=>{
 const look={constraints:{maxWidth:120,minHeight:40}},frame=item(look);
 const next=planeResizePatch(frame,holder,look,"se",{x:-180,y:200},{rtl:false})!;
 expect(next.w).toBeCloseTo(120);const fixed=project3(next.matrix,{x:0,y:0})!,oldFixed=project3(frame.matrix,{x:0,y:0})!;expect(fixed.x).toBeCloseTo(oldFixed.x,8);expect(fixed.y).toBeCloseTo(oldFixed.y,8);
 expect(planeResizePatch(frame,holder,{constraints:{minWidth:200,maxWidth:100}},"e",{x:0,y:20},{rtl:false})).toBeNull();
});
test("movement and constraints inherit per screen without flattening independent overrides",()=>{
 const node:any={id:"x",type:"stack",props:{},style:{base:{movement:"vertical",constraints:{minWidth:50,maxWidth:400}},tablet:{constraints:{maxWidth:300}},mobile:{movement:"horizontal",constraints:{minHeight:40}}}};
 expect(effectiveConstraints(node,"mobile")).toEqual({minWidth:50,maxWidth:300,minHeight:40});expect(movementOf(node,"tablet")).toBe("vertical");expect(movementOf(node,"mobile")).toBe("horizontal");expect(movementOf({id:"x",type:"stack",props:{}},"base")).toBe("free");
});

test("keyboard nudges follow holder-local axes and cannot bypass a persistent movement lock",()=>{
 const frame=item();expect(planeNudgePatch(frame,holder,{}, {x:10,y:0},"vertical",true,false)).toBeNull();
 const next=planeNudgePatch(frame,holder,{}, {x:10,y:10},"horizontal",true,false)!;
 expect((next.patch.layer as any).x).toBeCloseTo(100*40/600,6);expect((next.patch.layer as any).y).toBeCloseTo(10,6);
 const before=project3(frame.matrix,{x:0,y:0})!,after=project3(next.matrix,{x:0,y:0})!;expect(after.x).toBeCloseTo(before.x);expect(after.y-before.y).toBeCloseTo(20);
});

test("browser coefficient rounding never accumulates into the saved locked coordinate",()=>{
 const look={layer:{x:5,y:10,anchor:"top-start"}},frame=item(look);const matrix=[...frame.matrix];matrix[2]+=.00012;
 const next=planeMoveLocalPatch({...frame,matrix:matrix as unknown as Mat3},holder,look,{x:10,y:0},false,false)!;
 expect((next.patch.layer as any).y).toBe(10);
});

test("a wider-screen edit validates every narrower inherited constraint set",()=>{
 const node:any={id:"x",type:"stack",props:{},style:{base:{constraints:{maxWidth:400}},mobile:{constraints:{minWidth:300}}}};
 expect(validResponsiveConstraints(node)).toBe(true);node.style.base.constraints.maxWidth=200;expect(validResponsiveConstraints(node)).toBe(false);
});

test("scaling a transformed flow group keeps its intrinsic dimensions and layout context",()=>{
 const look={width:"100%",scale:1,origin:"top"},frame=item(look);
 const next=planeResizePatch(frame,holder,look,"se",{x:-30,y:40},{rtl:false,scaleContents:true})!;
 expect(next.patch.layer).toBeUndefined();expect(next.patch.width).toBeUndefined();expect(next.patch.height).toBeUndefined();expect(next.w).toBe(frame.w);expect(next.h).toBe(frame.h);expect(Number(next.patch.scale)).toBeGreaterThan(1);
 const before=project3(frame.matrix,{x:0,y:0})!,after=project3(next.matrix,{x:0,y:0})!;expect(after.x).toBeCloseTo(before.x,6);expect(after.y).toBeCloseTo(before.y,6);
});
