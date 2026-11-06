import { boundsOfQuad,cmsTransform,inverse3,localAxisDelta,multiply3,planeQuad,project3,resizePlane,type Mat3,type MovementAxis,type Plane,type Point } from "../../../shared/geometry/plane";
import type { PageTreeNode,TreeScreen } from "../api/pages.api";
import { constrainSize,type SizeConstraints } from "./layoutConstraints";
import type { Handle } from "./handles";

export type PlaneChange = Plane & { quad:Point[];box:{x:number;y:number;w:number;h:number};patch:Record<string,unknown> };
const translate=(x:number,y:number):Mat3=>[1,0,x,0,1,y,0,0,1];
const decimal=(value:number)=>Number(value.toFixed(6));
const px=(value:number)=>`${decimal(value)}px`;

export function canvasPlane(plane:Plane,scroll:Point,pan:Point,zoom:number):Plane|null {
  if(!(zoom>0)||![zoom,scroll.x,scroll.y,pan.x,pan.y].every(Number.isFinite))return null;
  const matrix=multiply3([zoom,0,pan.x-zoom*scroll.x,0,zoom,pan.y-zoom*scroll.y,0,0,1],plane.matrix);
  return planeQuad(matrix,plane)?{w:plane.w,h:plane.h,matrix}:null;
}

export function effectiveConstraints(node:PageTreeNode,screen:TreeScreen):SizeConstraints {
  const styles=node.style as Record<string,{constraints?:SizeConstraints}>|undefined;
  return {...styles?.base?.constraints,...(screen!=="base"?styles?.tablet?.constraints:{}),...(screen==="mobile"?styles?.mobile?.constraints:{})};
}
export function validResponsiveConstraints(node:PageTreeNode):boolean {
  return (["base","tablet","mobile"] as const).every(screen=>constrainSize(100,100,effectiveConstraints(node,screen))!==null);
}
export function movementOf(node:PageTreeNode,screen:TreeScreen):MovementAxis {
  const styles=node.style as Record<string,{movement?:unknown}>|undefined;
  const mode=(screen==="mobile"?styles?.mobile?.movement:undefined)??(screen!=="base"?styles?.tablet?.movement:undefined)??styles?.base?.movement;
  return mode==="vertical"||mode==="horizontal"||mode==="both"?mode:"free";
}

/** Existing layer bounds are required; don't silently clamp and move a fixed point. */
function patchAt(layout:Point,size:{w:number;h:number},holder:Plane,look:Record<string,unknown>,rtl:boolean,freeze:boolean):Record<string,unknown>|null {
  const old=look.layer&&typeof look.layer==="object"?look.layer as Record<string,unknown>:{};
  const x=100*(rtl?holder.w-layout.x-size.w:layout.x)/holder.w,y=100*layout.y/holder.h;
  if(![x,y].every(Number.isFinite)||x < -1e-5||x>100+1e-5||y< -1e-5||y>100+1e-5)return null;
  return {layer:{...old,anchor:typeof old.anchor==="string"?old.anchor:"top-start",x:decimal(Math.max(0,Math.min(100,x))),y:decimal(Math.max(0,Math.min(100,y)))},...(freeze?{width:px(size.w),height:px(size.h),maxWidth:px(size.w),minHeight:"0px"}:{})};
}

export function planeResizePatch(frame:Plane,holder:Plane,look:Record<string,unknown>,handle:Handle,delta:Point,options:{rtl:boolean;keep?:boolean;scaleContents?:boolean}):PlaneChange|null {
  const constraints=(look.constraints??{}) as SizeConstraints;
  const result=resizePlane(frame,holder,look,handle,delta,{rtl:options.rtl,keep:options.keep||options.scaleContents,...(!options.scaleContents?{constrain:(size:{w:number;h:number})=>constrainSize(size.w,size.h,constraints)}:{})});
  if(!result)return null;
  if(options.scaleContents){
    const currentScale=Number(look.scale??1),base=resizePlane(frame,holder,look,"se",{x:0,y:0},{rtl:options.rtl});
    if(!base||!Number.isFinite(currentScale)||currentScale<=0)return null;
    const fx=handle.includes("e")?0:handle.includes("w")?1:.5,fy=handle.includes("s")?0:handle.includes("n")?1:.5;
    const inv=inverse3(holder.matrix);
    const fixed=project3(frame.matrix,{x:frame.w*fx,y:frame.h*fy});
    const localFixed=fixed&&inv&&project3(inv,fixed),activeLocal={x:frame.w*(1-fx),y:frame.h*(1-fy)},oldActive=project3(frame.matrix,activeLocal);
    if(!localFixed||!oldActive)return null;
    const target={x:oldActive.x+delta.x,y:oldActive.y+delta.y};
    const evaluate=(ratio:number):{change:PlaneChange;active:Point}|null=>{
      const scale=currentScale*ratio,own=cmsTransform({...look,scale},frame,options.rtl),at={x:frame.w*fx,y:frame.h*fy},newFixed=own&&project3(own,at);
      if(!own||!newFixed||scale<.1-1e-9||scale>4+1e-9)return null;
      const w=own[6]*at.x+own[7]*at.y+own[8];
      const moveX=Number(look.moveX??0)+(localFixed.x-base.layout.x-newFixed.x)*w,moveY=Number(look.moveY??0)+(localFixed.y-base.layout.y-newFixed.y)*w;
      if(![moveX,moveY].every(Number.isFinite)||Math.abs(moveX)>1000||Math.abs(moveY)>1000)return null;
      const transformed=cmsTransform({...look,scale,moveX,moveY},frame,options.rtl);if(!transformed)return null;
      const matrix=multiply3(holder.matrix,multiply3(translate(base.layout.x,base.layout.y),transformed)),quad=planeQuad(matrix,frame),box=quad&&boundsOfQuad(quad),active=project3(matrix,activeLocal);
      return quad&&box&&active?{change:{matrix,w:frame.w,h:frame.h,quad,box,patch:{scale:decimal(scale),moveX:decimal(moveX),moveY:decimal(moveY)}},active}:null;
    };
    const low=.1/currentScale,high=4/currentScale,clamp=(n:number)=>Math.max(low,Math.min(high,n));
    let ratio=clamp(result.size.w/frame.w),best=evaluate(ratio);if(!best)return null;
    const error=(p:Point)=>(p.x-target.x)**2+(p.y-target.y)**2;
    for(let i=0;i<16&&error(best.active)>1e-12;i++){
      const step=Math.max(1e-5,ratio*1e-5),probe=evaluate(clamp(ratio+step));if(!probe)break;
      const distance=clamp(ratio+step)-ratio;if(!distance)break;
      const x=(probe.active.x-best.active.x)/distance,y=(probe.active.y-best.active.y)/distance,norm=x*x+y*y;if(norm<1e-12)break;
      const correction=((target.x-best.active.x)*x+(target.y-best.active.y)*y)/norm;
      let improved=false;for(let j=0;j<12;j++){const candidateRatio=clamp(ratio+correction*2**-j),candidate=evaluate(candidateRatio);if(candidate&&error(candidate.active)<error(best.active)-1e-12){ratio=candidateRatio;best=candidate;improved=true;break;}}
      if(!improved)break;
    }
    return best.change;
  }
  const patch=patchAt(result.layout,result.size,holder,look,options.rtl,true);
  return patch?{matrix:result.matrix,w:result.size.w,h:result.size.h,quad:result.quad,box:result.box,patch}:null;
}

/** Move with a holder-local translation; the element keeps its own projective transform. */
export function planeMoveLocalPatch(frame:Plane,holder:Plane,look:Record<string,unknown>,delta:Point,rtl:boolean,freeze:boolean):PlaneChange|null {
  const base=resizePlane(frame,holder,look,"se",{x:0,y:0},{rtl});
  const own=cmsTransform(look,frame,rtl);if(!base||!own||![delta.x,delta.y].every(Number.isFinite))return null;
  const layout={x:base.layout.x+delta.x,y:base.layout.y+delta.y};
  const placed=look.layer&&typeof look.layer==="object"?look.layer as {x?:unknown;y?:unknown}:null;
  if(placed&&Math.abs(delta.x)<1e-10&&typeof placed.x==="number")layout.x=rtl?holder.w*(1-placed.x/100)-frame.w:holder.w*placed.x/100;
  if(placed&&Math.abs(delta.y)<1e-10&&typeof placed.y==="number")layout.y=holder.h*placed.y/100;
  const matrix=multiply3(holder.matrix,multiply3(translate(layout.x,layout.y),own)),quad=planeQuad(matrix,frame),box=quad&&boundsOfQuad(quad);
  const patch=patchAt(layout,frame,holder,look,rtl,freeze);
  if(patch&&placed){const layer=patch.layer as Record<string,unknown>;if(Math.abs(delta.x)<1e-10)layer.x=placed.x;if(Math.abs(delta.y)<1e-10)layer.y=placed.y;}
  return quad&&box&&patch?{matrix,w:frame.w,h:frame.h,quad,box,patch}:null;
}

export function planeMovePatch(frame:Plane,holder:Plane,look:Record<string,unknown>,delta:Point,grab:Point,axis:MovementAxis,inside:boolean,rtl:boolean):PlaneChange|null {
  const inv=inverse3(holder.matrix),at=inv&&project3(inv,grab);if(!inv||!at)return null;
  const local=localAxisDelta(holder.matrix,at,delta,axis);if(!local)return null;
  const relative=multiply3(inv,frame.matrix),quad=planeQuad(relative,frame),bounds=quad&&boundsOfQuad(quad);if(!bounds)return null;
  if(inside||axis!=="free"){
    const minX=-bounds.x,maxX=holder.w-bounds.x-bounds.w,minY=-bounds.y,maxY=holder.h-bounds.y-bounds.h;
    if(minX>maxX||minY>maxY)return null;
    local.x=Math.max(minX,Math.min(maxX,local.x));local.y=Math.max(minY,Math.min(maxY,local.y));
    if(axis==="vertical"&&Math.abs(local.x)>1e-8 || axis==="horizontal"&&Math.abs(local.y)>1e-8)return null;
  }
  return planeMoveLocalPatch(frame,holder,look,local,rtl,!look.layer);
}

export function planeNudgePatch(frame:Plane,holder:Plane,look:Record<string,unknown>,delta:Point,axis:MovementAxis,inside:boolean,rtl:boolean):PlaneChange|null {
  const allowed={x:axis==="vertical"?0:delta.x,y:axis==="horizontal"?0:delta.y};
  if(Math.hypot(allowed.x,allowed.y)<1e-9)return null;
  const inverse=inverse3(holder.matrix),grab=project3(frame.matrix,{x:frame.w/2,y:frame.h/2}),at=inverse&&grab&&project3(inverse,grab);
  const next=at&&project3(holder.matrix,{x:at.x+allowed.x,y:at.y+allowed.y});
  return grab&&next?planeMovePatch(frame,holder,look,{x:next.x-grab.x,y:next.y-grab.y},grab,axis,inside,rtl):null;
}
