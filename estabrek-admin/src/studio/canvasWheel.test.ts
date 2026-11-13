import { describe, expect, it } from "vitest";
import { wheelOver } from "./canvasWheel";

// A page three screens long in a 1280 × 800 frame, on a canvas of 1100 × 700.
const frame = { w: 1280, h: 800 };
const canvas = { w: 1100, h: 700 };
const page = (y: number) => ({ scroll: { x: 0, y }, doc: { w: 1280, h: 2400 }, viewport: { w: 1280, h: 800 } });

describe("the wheel over the page", () => {
  it("scrolls the page (by the zoom) and leaves the canvas alone while the page still scrolls", () => {
    const step = wheelOver({ x: 0, y: 120 }, { zoom: 1.5, pan: { x: -200, y: -300 } }, frame, canvas, page(400));
    expect(step.scroll.y).toBeCloseTo(80);
    expect(step.pan).toEqual({ x: 0, y: 0 });
  });

  it("at the page's end, a frame that goes on below the canvas is brought up until its bottom shows", () => {
    // The frame is 1200 px tall on the screen and starts at −300: its bottom is 200 px below the canvas.
    const view = { zoom: 1.5, pan: { x: -200, y: -300 } };
    const step = wheelOver({ x: 0, y: 120 }, view, frame, canvas, page(1600));
    expect(step.scroll.y).toBe(0);
    expect(step.pan.y).toBe(-120);
    // Never past the edge: the last turn stops with the frame's bottom just inside the canvas.
    const near = wheelOver({ x: 0, y: 120 }, { zoom: 1.5, pan: { x: -200, y: -500 } }, frame, canvas, page(1600));
    expect(near.pan.y).toBe(-24);
    expect(wheelOver({ x: 0, y: 120 }, { zoom: 1.5, pan: { x: -200, y: -524 } }, frame, canvas, page(1600)).pan.y).toBe(0);
  });

  it("at the page's top, a frame that starts above the canvas is brought down until its top shows", () => {
    const step = wheelOver({ x: 0, y: -100 }, { zoom: 1.5, pan: { x: -200, y: -300 } }, frame, canvas, page(0));
    expect(step.scroll.y).toBe(0);
    expect(step.pan.y).toBe(100);
    expect(wheelOver({ x: 0, y: -100 }, { zoom: 1.5, pan: { x: -200, y: 24 } }, frame, canvas, page(0)).pan.y).toBe(0);
  });

  it("what the page can't take of one turn goes to the canvas", () => {
    // 30 page px left to scroll (45 on the screen); the other 75 of this turn move the canvas.
    const step = wheelOver({ x: 0, y: 120 }, { zoom: 1.5, pan: { x: -200, y: -300 } }, frame, canvas, page(1570));
    expect(step.scroll.y).toBeCloseTo(30);
    expect(step.pan.y).toBeCloseTo(-75);
  });

  it("sideways: a page that doesn't scroll that way lets the canvas show the frame's cut side", () => {
    const view = { zoom: 1.5, pan: { x: -200, y: 0 } };
    expect(wheelOver({ x: -60, y: 0 }, view, frame, canvas, page(0)).pan.x).toBe(60);
    expect(wheelOver({ x: 60, y: 0 }, view, frame, canvas, page(0)).pan.x).toBe(-60);
  });

  it("a frame that fits the canvas never moves it, and an unmeasured page just scrolls", () => {
    const fit = { zoom: 0.8, pan: { x: 38, y: 30 } };
    expect(wheelOver({ x: 0, y: 120 }, fit, frame, canvas, page(1600)).pan).toEqual({ x: 0, y: 0 });
    expect(wheelOver({ x: 0, y: -120 }, fit, frame, canvas, page(0)).pan).toEqual({ x: 0, y: 0 });
    expect(wheelOver({ x: 0, y: 120 }, { zoom: 2, pan: { x: 0, y: -600 } }, frame, canvas, null)).toEqual({ scroll: { x: 0, y: 60 }, pan: { x: 0, y: 0 } });
  });
});
