import { expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
const check = (type: string, props: Record<string, unknown>) => checkTree({version:1,root:{id:"page",type:"page",props:{},children:[{id:"sec",type:"section",props:{},children:[{id:"widget",type,props}]}]}});
test("a source index keeps its empty initial canvas and bento gallery stays editable", () => {
 const props = {layout:"split",presentation:"index",initial:-1,filters:false,showCount:false,items:[{title:{en:"Work"},image:"/a.jpg"}]};
 const result=check("filterGallery", props);expect(result.ok,JSON.stringify(result)).toBe(true);
 if(result.ok)expect(result.tree.root.children![0].children![0].props).toMatchObject(props);
 expect(check("filterGallery",{...props,layout:"bento"}).ok).toBe(true);
 expect(check("filterGallery",{...props,initial:-2}).ok).toBe(false);
});
test("piano source songs are selectable native instrument settings",()=>{
 const props={kind:"piano",showPlayer:true,playlist:["jingle","wish","silent"],melody:"jingle"};
 const result=check("instrument",props);expect(result.ok,JSON.stringify(result)).toBe(true);
 if(result.ok)expect(result.tree.root.children![0].children![0].props).toMatchObject(props);
 expect(check("instrument",{...props,playlist:["untrusted"]}).ok).toBe(false);
});
test("clay panels preserve the expanding horizontal source layout",()=>{
 const result=check("showcase",{look:"clay",items:[{title:{en:"One inbox"}}],height:400,layout:"horizontal",activation:"hover"});
 expect(result.ok).toBe(true);if(result.ok)expect(result.tree.root.children![0].children![0].props.look).toBe("clay");
});
