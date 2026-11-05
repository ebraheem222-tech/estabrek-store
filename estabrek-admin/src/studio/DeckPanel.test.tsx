import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeckPanel } from "./DeckPanel";
import { accepts, newElement, copyOf } from "./columns";
afterEach(cleanup);
test("copying an enclosing section remaps nested deck labels to the copied panel IDs",()=>{
 const node={id:"sec",type:"section",props:{},children:[{id:"deck",type:"deck",props:{labels:{one:{ar:"أعمال",en:"Work"},two:{en:"About"}},initial:1},children:[{id:"one",type:"stack",props:{},children:[]},{id:"two",type:"stack",props:{},children:[]}]}]};
 let n=0;const copy=copyOf(node,p=>`${p}-${n++}`),deck=copy.children![0];
 expect(deck.props.labels).toEqual({[deck.children![0].id]:{ar:"أعمال",en:"Work"},[deck.children![1].id]:{en:"About"}});
 expect(deck.props.initial).toBe(1);expect(node.children[0].props.labels.one.en).toBe("Work");
});
test("deck panels and every creative widget can be placed in native containers", () => {
  expect(accepts("deck", "stack")).toBe(true); expect(accepts("deck", "heading")).toBe(false);
  for (const kind of ["deck", "instrument", "chart", "clock", "filterGallery"]) expect(accepts("stack", kind), kind).toBe(true);
  let id = 0;
  expect(newElement("deck", "en", prefix => `${prefix}-${id++}`).children).toHaveLength(3);
});
test("adding after a Layers deletion prunes the deleted panel's stale label",()=>{
 const onOps=vi.fn();let i=0;
 const children=Array.from({length:11},(_,n)=>({id:`panel${n}`,type:"stack",props:{},children:[]}));
 const labels=Object.fromEntries(Array.from({length:12},(_,n)=>[`panel${n}`,{en:`Panel ${n}`} ]));
 render(<DeckPanel node={{id:"deck",type:"deck",props:{labels},children}} lang="en" busy={false} onOps={onOps} ids={p=>`${p}-${i++}`} />);
 fireEvent.click(screen.getByTestId("deck-panel-add"));
 const props=onOps.mock.lastCall![1].find((op:any)=>op.op==="setProps").props;
 expect(Object.keys(props.labels)).toHaveLength(12);expect(props.labels).not.toHaveProperty("panel11");
});
test("panel reorder preserves labels and the initial panel, and adding a panel is undoable", () => {
  const onOps = vi.fn();
  const node = { id: "deck", type: "deck", props: { initial: 0, labels: { one: { en: "Work", ar: "أعمال" }, two: { en: "About" } } }, children: [{ id: "one", type: "stack", props: {}, children: [] }, { id: "two", type: "stack", props: {}, children: [] }] };
  let id = 0;
  render(<DeckPanel node={node} lang="en" busy={false} onOps={onOps} ids={prefix => `${prefix}-${id++}`} />);
  fireEvent.click(screen.getByTestId("deck-panel-down-one"));
  expect(onOps.mock.lastCall![1]).toEqual(expect.arrayContaining([{ op: "move", nodeId: "one", parentId: "deck", index: 1 }, expect.objectContaining({ op: "setProps", props: expect.objectContaining({ initial: 1 }) })]));
  fireEvent.click(screen.getByTestId("deck-panel-add"));
  expect(onOps.mock.lastCall![1]).toEqual(expect.arrayContaining([expect.objectContaining({ op: "insert", parentId: "deck", node: expect.objectContaining({ type: "stack" }) })]));
});
