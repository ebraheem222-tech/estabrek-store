import {afterEach,beforeEach,expect,test,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import StudioPage from "./StudioPage";
import {api} from "../api/http";
import {authStore} from "../store/auth.store";
import {newElement} from "./columns";
import {setLangForTests} from "../lib/lang";
import type {PageTreeNode} from "../api/pages.api";
import type {StoreThemeChoice} from "./storeThemes";

const originalAdapter=api.defaults.adapter;
const originalScroll=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollIntoView");
let client:QueryClient;
let choice:StoreThemeChoice|null=null;
let savedHeaders:Record<string,unknown>[]=[];
const pageId="editor-controls-test";
const drawing={...newElement("svg","en",()=>"drawing"),name:"Test drawing"};
const model={...newElement("model3d","en",()=>"model"),name:"Test model"};
const nodes:PageTreeNode[]=[drawing,model,{id:"questions",type:"accordion",name:"Test questions",props:{items:[{q:{en:"Question"},a:{en:"Answer"}}]}}];
const tree={version:1,root:{id:"page",type:"page",props:{},children:[{id:"section",type:"section",name:"Test section",props:{},children:nodes}]}};
beforeEach(()=>{
  choice=null;savedHeaders=[];
  vi.stubGlobal("ResizeObserver",class {observe(){} unobserve(){} disconnect(){}});
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:vi.fn()});
  localStorage.setItem("admin-lang","en");
  setLangForTests("en");
  client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
  client.setQueryData(["store-themes"],[]);
  client.setQueryData(["store-themes","full"],{themes:[],models:[],fonts:[]});
  authStore.setAdmin({id:"fixture-owner",email:"owner@example.test",role:"SUPERADMIN",owner:true} as never);
  api.defaults.adapter=async config=>{
    const path=String(config.url).split("?")[0];
    if(path.endsWith("/settings") && config.method!=="get"){
      const body=JSON.parse(config.data);
      savedHeaders.push(body.header);
      choice=body.header.storeTheme;
    }
    const data=path.endsWith("/preview-token")?{token:"fixture-only",expiresAt:new Date(Date.now()+1800000).toISOString()}:
      path.endsWith("/draft")?{draft:{version:1,rev:1,baseHash:"local",sections:[],trash:[],startedAt:"",updatedAt:"",tree},main:"en"}:
      path.endsWith("/tree")?{format:2,tree,saved:true}:
      path.endsWith("/site-styles")?{styles:[],draft:null}:
      path.endsWith("/settings")?{header:{identity:{industry:"fashion",audience:"women"},storeTheme:choice},languages:{default:"en",enabled:["en"]}}:
      path.endsWith(`/pages/${pageId}`)?{id:pageId,name:"Fixture",slug:"/",status:"DRAFT",kind:"page",sections:[],format:2}:
      path.includes("/models")?{items:[],maxBytes:1000000}:
      path.includes("background-removal")?{cloudinary:{on:false,ready:false,transformations:0}}:[];
    return {data:structuredClone(data),status:200,statusText:"OK",headers:{},config};
  };
});
afterEach(()=>{
  cleanup();client.clear();api.defaults.adapter=originalAdapter;localStorage.clear();vi.unstubAllGlobals();setLangForTests("ar");
  if(originalScroll) Object.defineProperty(HTMLElement.prototype,"scrollIntoView",originalScroll);
  else Reflect.deleteProperty(HTMLElement.prototype,"scrollIntoView");
});
async function open(){
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/studio/${pageId}`]}><Routes><Route path="/studio/:id" element={<StudioPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
  await waitFor(()=>expect(screen.getByTestId("studio-page-motion-open")).not.toBeDisabled());
  fireEvent.click(screen.getByTestId("studio-page-motion-open"));
  await waitFor(()=>expect(document.querySelector('[data-testid="studio-layer"][data-node="section"]')).toBeTruthy());
  pick("section");
}
function pick(id:string){const row=document.querySelector(`[data-testid="studio-layer"][data-node="${id}"]`);expect(row).toBeTruthy();fireEvent.click(row!);}
function state(value:string){fireEvent.click(screen.getByTestId("studio-states").querySelector(`[data-state="${value}"]`)!);}

test("SVG import and editing stay available while editing hover appearance",async()=>{
  await open();pick("drawing");expect(await screen.findByTestId("studio-svg")).toBeVisible();
  state("hover");expect(screen.getByTestId("studio-svg")).toBeVisible();
  expect(screen.getByTestId("studio-state-panels")).toHaveAttribute("data-state","hover");
});
test("3D content settings stay available in focused appearance",async()=>{
  await open();pick("model");expect(await screen.findByTestId("studio-model3d")).toBeVisible();
  state("focused");expect(screen.getByTestId("studio-model3d")).toBeVisible();
});
test("every section exposes its drawings and models without searching the Add menu",async()=>{
  await open();
  const tools=screen.getByTestId("studio-section-objects");
  expect(tools).toBeVisible();
  fireEvent.click(tools.querySelector('[data-node="drawing"]')!);
  expect(await screen.findByTestId("studio-svg")).toBeVisible();
  pick("section");fireEvent.click(screen.getByTestId("studio-section-objects").querySelector('[data-node="model"]')!);
  expect(await screen.findByTestId("studio-model3d")).toBeVisible();
});

test("returning to the current theme explicitly restores its saved mode and custom design",async()=>{
  choice={id:"my-owned-design",mode:"dark",custom:{palette:{dark:{accent:"#22cc88"}},round:1.4}};
  await open();fireEvent.click(screen.getByTestId("studio-theme-toggle"));
  fireEvent.click(document.querySelector('[data-testid="studio-theme-option"][data-theme-id="rose"]')!);
  expect(screen.getByTestId("studio-frame").getAttribute("src")).toContain("storeTheme=rose");
  fireEvent.click(document.querySelector('[data-testid="studio-theme-option"][data-theme-id="my-owned-design"]')!);
  const src=new URL(screen.getByTestId("studio-frame").getAttribute("src")!);
  expect(src.searchParams.get("storeTheme")).toBe(choice.id);
  expect(src.searchParams.get("themeMode")).toBe("dark");
  expect(JSON.parse(src.searchParams.get("themeCustom")!)).toEqual(choice.custom);
  expect(screen.getByTestId("studio-theme-save")).toBeDisabled();
});

test("clearing a saved explicit theme mode saves the default and preserves current customisations",async()=>{
  const custom={palette:{dark:{accent:"#22cc88"}},round:1.4};
  choice={id:"my-owned-design",mode:"dark",custom};
  await open();fireEvent.click(screen.getByTestId("studio-theme-toggle"));
  fireEvent.click(screen.getByRole("button",{name:"As the store"}));
  expect(screen.getByRole("button",{name:"As the store"})).toHaveAttribute("aria-pressed","true");
  expect(screen.getByTestId("studio-theme-save")).toBeEnabled();
  const src=new URL(screen.getByTestId("studio-frame").getAttribute("src")!);
  expect(src.searchParams.get("storeTheme")).toBe(choice.id);
  expect(src.searchParams.get("themeMode")).toBeNull();
  fireEvent.click(screen.getByTestId("studio-theme-save"));
  fireEvent.click(screen.getByRole("button",{name:"Save"}));
  await waitFor(()=>expect(savedHeaders).toHaveLength(1));
  expect(savedHeaders[0].storeTheme).toEqual({id:"my-owned-design",mode:null,custom});
});
