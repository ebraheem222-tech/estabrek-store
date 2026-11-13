// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";

// The pickers open the store's libraries (the API): not needed for what these cards save.
vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: ({ open, onSelect }: { open: boolean; onSelect: (u: string) => void }) => (open ? <button type="button" data-testid="fake-library" onClick={() => onSelect("/media/cover.jpg")}>pick</button> : null) }));
vi.mock("../components/media/VideoPickerModal", () => ({ VideoPickerModal: ({ open, onPick }: { open: boolean; onPick: (v: { url: string; posterUrl?: string }) => void }) => (open ? <button type="button" data-testid="fake-videos" onClick={() => onPick({ url: "/clips/new.mp4", posterUrl: "/clips/new.jpg" })}>pick</button> : null) }));

import { ContentPanel, videoStart, withVideoStart } from "./MediaPanels";
import { MediaStylePanel } from "./StylePanels";

afterEach(() => { cleanup(); setLangForTests("ar"); });

/** The cards on a node that keeps what they save (as the draft would). */
function Harness({ start, seen }: { start: PageTreeNode; seen: (n: PageTreeNode) => void }) {
  const [node, setNode] = useState(start);
  const onOps = (_label: string, ops: PageDraftOp[]) => {
    let next = node;
    for (const op of ops) {
      if (op.op === "setProps") next = { ...next, props: JSON.parse(JSON.stringify(op.props)) };
      if (op.op === "setStyle") next = { ...next, style: { ...(next.style ?? {}), [op.screen]: op.style ?? undefined } } as PageTreeNode;
    }
    setNode(next);
    seen(next);
  };
  return (
    <div data-insp-list="">
      <ContentPanel node={node} lang="en" busy={false} onOps={onOps} />
      {node.type === "image" || node.type === "video" ? <MediaStylePanel node={node} screen="base" busy={false} onOps={onOps} /> : null}
    </div>
  );
}
const open = (node: PageTreeNode) => {
  setLangForTests("en");
  let last = node;
  render(<Harness start={node} seen={(n) => { last = n; }} />);
  return { props: () => last.props as Record<string, unknown>, style: () => ((last.style ?? {}) as Record<string, Record<string, unknown> | undefined>).base ?? {} };
};
const pick = (group: string, value: string) => fireEvent.click(within(screen.getByTestId(group)).getByRole("button", { pressed: false, name: (_n, el) => el.getAttribute("data-value") === value }));

describe("a clip's settings, in its cards", () => {
  const clip: PageTreeNode = { id: "v", type: "video", props: { src: "/clips/a.mp4", controls: true } } as PageTreeNode;

  it("how it starts is one choice; a way that plays by itself says what that means and hides sound and buttons", () => {
    const now = open(clip);
    // Its playing is a card of its own, under the behaviour.
    expect(screen.getByTestId("studio-video-play").getAttribute("data-insp-as")).toBe("behaviour");
    expect(screen.getByTestId("studio-element").getAttribute("data-insp-as")).toBeNull();
    expect(screen.getByTestId("studio-video-muted")).toBeTruthy();
    expect(screen.queryByTestId("studio-video-self")).toBeNull();

    pick("studio-video-start", "view");
    expect(now.props()).toMatchObject({ src: "/clips/a.mp4", playOn: "view" });
    expect(now.props().autoplay).toBeUndefined();
    expect(screen.getByTestId("studio-video-self")).toBeTruthy();
    expect(screen.queryByTestId("studio-video-muted")).toBeNull();
    expect(screen.queryByTestId("studio-video-controls")).toBeNull();

    pick("studio-video-start", "auto");
    expect(now.props().autoplay).toBe(true);
    expect(now.props().playOn).toBeUndefined();

    pick("studio-video-start", "press");
    expect(now.props().autoplay).toBeUndefined();
    expect(now.props().playOn).toBeUndefined();
    expect(screen.getByTestId("studio-video-controls")).toBeTruthy();
  });

  it("again from the start, its speed, its sound, the download button, what loads first", () => {
    const now = open(clip);
    fireEvent.click(screen.getByTestId("studio-video-loop"));
    expect(now.props().loop).toBe(true);
    pick("studio-video-speed", "1.5");
    expect(now.props().speed).toBe(1.5);
    pick("studio-video-speed", "1");
    expect(now.props().speed).toBeUndefined();
    fireEvent.click(screen.getByTestId("studio-video-muted"));
    expect(now.props().muted).toBe(true);
    fireEvent.click(screen.getByTestId("studio-video-nodownload"));
    expect(now.props().noDownload).toBe(true);
    // Without the player's buttons the download button has nothing to hide.
    fireEvent.click(screen.getByTestId("studio-video-controls"));
    expect(now.props().controls).toBe(false);
    expect(screen.queryByTestId("studio-video-nodownload")).toBeNull();
    pick("studio-video-preload", "none");
    expect(now.props().preload).toBe("none");
    pick("studio-video-preload", "metadata");
    expect(now.props().preload).toBeUndefined();
  });

  it("the picture before it plays is chosen, changed and taken off; the library brings the clip's own", () => {
    const now = open(clip);
    expect(screen.queryByTestId("studio-video-poster")).toBeNull();
    fireEvent.click(screen.getByTestId("studio-video-poster-pick"));
    fireEvent.click(screen.getByTestId("fake-library"));
    expect(now.props().poster).toBe("/media/cover.jpg");
    expect(screen.getByTestId("studio-video-poster").getAttribute("src")).toBe("/media/cover.jpg");
    fireEvent.click(screen.getByTestId("studio-video-poster-clear"));
    expect(now.props().poster).toBeUndefined();
    fireEvent.click(screen.getByTestId("studio-pick-video"));
    fireEvent.click(screen.getByTestId("fake-videos"));
    expect(now.props()).toMatchObject({ src: "/clips/new.mp4", poster: "/clips/new.jpg" });
    // Its words for a screen reader, in the language being edited.
    const label = screen.getByTestId("studio-prop-label");
    fireEvent.change(label, { target: { value: "A scarf in the wind" } });
    fireEvent.blur(label);
    expect(now.props().label).toEqual({ en: "A scarf in the wind" });
  });

  it("one way of starting at a time, read back the same way", () => {
    expect(videoStart({})).toBe("press");
    expect(videoStart({ autoplay: true, playOn: "view" })).toBe("auto");
    expect(videoStart({ playOn: "hover" })).toBe("hover");
    expect(withVideoStart({ src: "/a.mp4", autoplay: true }, "hover")).toEqual({ src: "/a.mp4", autoplay: undefined, playOn: "hover" });
    expect(withVideoStart({ src: "/a.mp4", playOn: "view" }, "press")).toEqual({ src: "/a.mp4", autoplay: undefined, playOn: undefined });
  });
});

describe("a picture's settings, in its cards", () => {
  const photo: PageTreeNode = { id: "i", type: "image", props: { src: "/a.jpg" }, style: { base: { width: "360px", height: "260px" } } } as PageTreeNode;

  it("its link opens in a new tab only once it has one; taking the link off takes that with it", () => {
    const now = open(photo);
    expect(screen.getByTestId("studio-image-link").getAttribute("data-insp-as")).toBe("behaviour");
    expect(screen.queryByTestId("studio-image-newtab")).toBeNull();
    const href = screen.getByTestId("studio-prop-href");
    fireEvent.change(href, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(href);
    expect(now.props().href).toBeUndefined();
    fireEvent.change(href, { target: { value: "/shop" } });
    fireEvent.blur(href);
    expect(now.props().href).toBe("/shop");
    fireEvent.click(screen.getByTestId("studio-image-newtab"));
    expect(now.props().newTab).toBe(true);
    fireEvent.change(screen.getByTestId("studio-prop-href"), { target: { value: "" } });
    fireEvent.blur(screen.getByTestId("studio-prop-href"));
    expect(now.props().href).toBeUndefined();
    expect(now.props().newTab).toBeUndefined();
  });

  it("it can load first; its description is kept in the language being edited", () => {
    const now = open(photo);
    fireEvent.click(screen.getByTestId("studio-image-priority"));
    expect(now.props().priority).toBe(true);
    const alt = screen.getByTestId("studio-prop-alt");
    fireEvent.change(alt, { target: { value: "Silk scarves" } });
    fireEvent.blur(alt);
    expect(now.props().alt).toEqual({ en: "Silk scarves" });
  });

  it("its frame's proportions let the height follow the width; back to as it is clears them", () => {
    const now = open(photo);
    pick("studio-media-aspect", "16/9");
    expect(now.style()).toEqual({ width: "360px", aspect: "16/9" });
    pick("studio-media-aspect", "");
    expect(now.style()).toEqual({ width: "360px" });
  });
});
