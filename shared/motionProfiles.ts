/** Plain tree transforms shared by the editor and template preview/import APIs. */
export const MOTION_ENGINES = ["gsap", "anime"] as const;
export const MOTION_PRESETS = ["original", "none", "calm", "rich"] as const;
export type MotionEngine = (typeof MOTION_ENGINES)[number];
export type MotionPreset = (typeof MOTION_PRESETS)[number];
export type MotionProfile = { engine?: MotionEngine; preset?: MotionPreset };
export type ProfileNode = { id: string; type: string; props: Record<string, unknown>; motion?: unknown; children?: ProfileNode[] };

const FIXED = new Set(["page", "legacy", "roseBlock", "block"]);
const CONTENT = new Set(["heading", "text", "image", "video", "button", "svg", "model3d", "lottie", "rive", "form", "products", "categories", "product360"]);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Copy first: choosing another profile never mutates a library template or saved document. */
export function withMotionProfile<T extends ProfileNode>(nodes: readonly T[], options?: MotionProfile): T[] {
  const copy = structuredClone([...nodes]);
  const engine = MOTION_ENGINES.includes(options?.engine as MotionEngine) ? options!.engine : undefined;
  const preset = MOTION_PRESETS.includes(options?.preset as MotionPreset) ? options!.preset! : "original";
  const visit = (node: ProfileNode) => {
    if (preset === "none") delete node.motion;
    else if (!FIXED.has(node.type)) {
      const current = object(node.motion);
      if (preset === "original") {
        if (engine && ["enter", "scroll", "loop", "hover", "fx"].some((key) => current[key])) node.motion = { ...current, engine };
      } else if (CONTENT.has(node.type)) {
        const selected = engine ?? (current.engine === "anime" ? "anime" : "gsap");
        if (preset === "calm") node.motion = { engine: selected, enter: { kind: "fade", duration: 0.6 }, phone: "lite" };
        else {
          const kind = node.type === "heading" ? "words" : node.type === "image" || node.type === "video" ? "zoom-out" : "up";
          node.motion = {
            engine: selected, enter: { kind, duration: node.type === "button" ? 0.45 : 0.85, distance: 28, ...(kind === "words" ? { stagger: 0.05 } : {}) },
            ...(node.type === "button" ? { hover: { kind: "lift" } } : node.type === "image" || node.type === "video" ? { hover: { kind: "zoom" } } : {}), phone: "lite",
          };
        }
      } else delete node.motion; // Avoid combining container entrances with every child's profile.
    }
    // Old sections keep their editable element motions in page.props.looks.
    // Treat those elements like ordinary nodes without changing their style or target.
    if (node.type === "page" && (engine || preset !== "original")) {
      for (const [target, value] of Object.entries(object(node.props.looks))) {
        const look = object(value);
        const kind = typeof look.kind === "string" ? look.kind : "";
        if (!["text", "button", "image", "video", "box"].includes(kind)) continue;
        const element: ProfileNode = { id: target, type: kind === "box" ? "section" : kind, props: {}, ...(look.motion !== undefined ? { motion: look.motion } : {}) };
        visit(element);
        if (element.motion === undefined) delete look.motion;
        else look.motion = element.motion;
      }
    }
    node.children?.forEach(visit);
  };
  copy.forEach(visit);
  return copy;
}

/** Unknown query values stay inert; they never become executable animation options. */
export function motionProfileFromQuery(params: Pick<URLSearchParams, "get">): MotionProfile {
  const engine = params.get("motionEngine");
  const preset = params.get("motionPreset");
  return {
    ...(MOTION_ENGINES.includes(engine as MotionEngine) ? { engine: engine as MotionEngine } : {}),
    ...(MOTION_PRESETS.includes(preset as MotionPreset) ? { preset: preset as MotionPreset } : {}),
  };
}
