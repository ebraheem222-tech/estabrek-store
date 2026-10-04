import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CmsPageRenderer } from "./PageRenderer";

describe("CmsPageRenderer hero split mode", () => {
  it("renders left and right hero panes in split mode", () => {
    render(
      <CmsPageRenderer
        sections={[
          {
            id: "hero-1",
            type: "HERO",
            order: 1,
            isVisible: true,
            data: {
              title: "Left hero title",
              subtitle: "Left subtitle",
              splitMode: true,
              splitRatio: "3:2",
              splitGap: 20,
              align: "left",
              primaryButton: { label: "Shop Left", href: "/left" },
              splitRight: {
                title: "Right hero title",
                subtitle: "Right subtitle",
                align: "right",
                primaryButton: { label: "Shop Right", href: "/right" },
              },
            },
          } as any,
        ]}
      />
    );

    expect(screen.getByText("Left hero title")).toBeInTheDocument();
    expect(screen.getByText("Right hero title")).toBeInTheDocument();
    expect(screen.getByText("Shop Left")).toBeInTheDocument();
    expect(screen.getByText("Shop Right")).toBeInTheDocument();
  });

  it("renders section divider preset from twTokens", () => {
    const { container } = render(
      <CmsPageRenderer
        sections={[
          {
            id: "text-1",
            type: "RICH_TEXT",
            order: 1,
            isVisible: true,
            data: {
              title: "With divider",
              html: "<p>Body</p>",
              twTokens: { dividerStyleId: "divider-short-color" },
            },
          } as any,
        ]}
      />
    );

    expect(container.querySelector(".bg-blue-500.mx-auto.rounded-full")).toBeTruthy();
  });

  it("renders triple hero mode (left content + center image + right indicators)", () => {
    render(
      <CmsPageRenderer
        sections={[
          {
            id: "hero-triple",
            type: "HERO",
            order: 1,
            isVisible: true,
            data: {
              tripleMode: true,
              tripleLayout: "4:5:1",
              title: "Triple hero title",
              subtitle: "Triple subtitle",
              eyebrow: "HEADER",
              centerImageUrl: "https://example.com/model.png",
              centerImageAlt: "center-model",
              rightIndicators: 4,
              rightActiveIndicator: 2,
              primaryButton: { label: "Shop now", href: "/shop" },
            },
          } as any,
        ]}
      />
    );

    expect(screen.getByText("Triple hero title")).toBeInTheDocument();
    expect(screen.getByText("HEADER")).toBeInTheDocument();
    expect(screen.getByAltText("center-model")).toBeInTheDocument();
    expect(screen.getByText("Shop now")).toBeInTheDocument();
  });

  it("renders container blocks in one row when nested layouts use row mode", () => {
    const { container } = render(
      <CmsPageRenderer
        sections={[
          {
            id: "grid-container",
            type: "GRID",
            order: 1,
            isVisible: true,
            data: {
              mode: "container",
              title: "Nested container",
              blocks: [
                {
                  type: "RICH_TEXT",
                  isVisible: true,
                  data: {
                    title: "Left block",
                    html: "<p>Left</p>",
                    layout: { mode: "row", group: "hero-row", columns: 10, span: 6 },
                  },
                },
                {
                  type: "RICH_TEXT",
                  isVisible: true,
                  data: {
                    title: "Right block",
                    html: "<p>Right</p>",
                    layout: { mode: "row", group: "hero-row", columns: 10, span: 4 },
                  },
                },
              ],
            },
          } as any,
        ]}
      />
    );

    expect(screen.getByText("Left block")).toBeInTheDocument();
    expect(screen.getByText("Right block")).toBeInTheDocument();
    expect(container.querySelector(".flex.flex-wrap.items-stretch.gap-5")).toBeTruthy();
  });
});
