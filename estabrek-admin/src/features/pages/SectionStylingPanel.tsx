// ============================================================
// ESTABREK SECTION STYLING PANEL
// ============================================================
// UI for editing section motion (GSAP) and decorations (SVG)
// ============================================================

import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { cn } from "../../components/ui/cn";
import {
  ANIM_PRESETS,
  EASING_PRESETS,
  DECOR_SHAPE_PRESETS,
  DECOR_PLACEMENT_PRESETS,
  DECOR_SIZE_PRESETS,
  DECOR_COLOR_PRESETS,
  DECOR_BLUR_PRESETS,
  ANIM_LABELS,
  SHAPE_LABELS,
  type TwTokens,
  type AnimPreset,
  type EasingPreset,
  type DecorShapePreset,
  type DecorPlacementPreset,
  type DecorSizePreset,
  type DecorColorPreset,
  type DecorBlurPreset,
  type DecorLayer,
  type MotionConfig,
  TEXT_COLOR_PRESETS,
} from "../../cms/style/tokens";

// ============================================================
// PROPS
// ============================================================

interface SectionStylingPanelProps {
  tokens?: TwTokens;
  onChange: (tokens: TwTokens) => void;
  className?: string;
}

// ============================================================
// TABS
// ============================================================

type TabId = "motion" | "decorations" | "spacing" | "advanced";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "motion", label: "الحركة", icon: "✨" },
  { id: "decorations", label: "الزخارف", icon: "🌊" },
  { id: "spacing", label: "المسافات", icon: "↔️" },
  { id: "advanced", label: "متقدم", icon: "⚙️" },
];

// ============================================================
// HELPER COMPONENTS
// ============================================================

function FieldGroup({
  label,
  labelAr,
  hint,
  children,
  className,
}: {
  label: string;
  labelAr?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block">
        <span className="text-sm font-medium text-white">{label}</span>
        {labelAr && <span className="text-xs text-white/50 mr-1">({labelAr})</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:cursor-pointer
        "
      />
      <span className="text-sm font-medium text-white min-w-[3rem] text-center">
        {value}{suffix}
      </span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-white/30" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
          style={{ marginTop: "2px" }}
        />
      </button>
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}

function ButtonGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
            value === opt.value
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Divider({ title }: { title?: string }) {
  if (title) {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wide">{title}</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>
    );
  }
  return <div className="h-px bg-white/[0.08] my-4" />;
}

function parseLinearGradient(value?: string) {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/linear-gradient\(([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
  if (!match) return null;
  return {
    dir: match[1].trim(),
    from: match[2].trim(),
    to: match[3].trim(),
  };
}

// ============================================================
// MOTION EDITOR
// ============================================================

function MotionEditor({
  motion,
  onChange,
}: {
  motion?: MotionConfig;
  onChange: (m: MotionConfig) => void;
}) {
  const preset = motion?.anim ?? motion?.preset ?? "none";
  const duration = motion?.duration ?? 0.8;
  const delay = motion?.delay ?? 0;
  const easing = motion?.easing || "power3.out";
  const stagger = motion?.stagger ?? 0.1;
  const threshold = motion?.threshold ?? 0.2;
  const once = motion?.once ?? true;

  const animOptions = ANIM_PRESETS.map((p) => ({
    value: p,
    label: ANIM_LABELS[p]?.ar || p,
  }));

  const easingOptions = EASING_PRESETS.map((e) => ({
    value: e,
    label: e.replace(".out", "").replace("(1.7)", "").replace("(1, 0.3)", ""),
  }));

  return (
    <div className="space-y-4">
      <FieldGroup label="نوع الحركة" labelAr="Animation Preset">
        <Select
          value={preset}
          onChange={(v) => onChange({ ...motion, anim: v as AnimPreset, preset: v as AnimPreset })}
          options={animOptions}
        />
      </FieldGroup>

      {preset !== "none" && (
        <>
          <FieldGroup label="المدة" labelAr="Duration">
            <Slider
              value={duration}
              onChange={(v) => onChange({ ...motion, duration: v })}
              min={0.1}
              max={3}
              step={0.1}
              suffix="s"
            />
          </FieldGroup>

          <FieldGroup label="التأخير" labelAr="Delay">
            <Slider
              value={delay}
              onChange={(v) => onChange({ ...motion, delay: v })}
              min={0}
              max={2}
              step={0.1}
              suffix="s"
            />
          </FieldGroup>

          <FieldGroup label="التسهيل" labelAr="Easing">
            <Select
              value={easing}
              onChange={(v) => onChange({ ...motion, easing: v as EasingPreset })}
              options={easingOptions}
            />
          </FieldGroup>

          {preset.startsWith("stagger") && (
            <FieldGroup label="التتابع" labelAr="Stagger">
              <Slider
                value={stagger}
                onChange={(v) => onChange({ ...motion, stagger: v })}
                min={0.01}
                max={0.5}
                step={0.01}
                suffix="s"
              />
            </FieldGroup>
          )}

          <FieldGroup label="عتبة الظهور" labelAr="Threshold">
            <Slider
              value={threshold * 100}
              onChange={(v) => onChange({ ...motion, threshold: v / 100 })}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </FieldGroup>

          <Toggle
            checked={once}
            onChange={(v) => onChange({ ...motion, once: v })}
            label="تشغيل الحركة مرة واحدة فقط"
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// DECORATION EDITOR
// ============================================================

function DecorationLayerEditor({
  layer,
  onChange,
  label,
}: {
  layer?: DecorLayer;
  onChange: (l: DecorLayer) => void;
  label: string;
}) {
  const shape = layer?.shape || "none";
  const placement = layer?.placement || "bottom";
  const size = layer?.size || "md";
  const color = layer?.color || "accent";
  const opacity = layer?.opacity || "100";
  const blur = layer?.blur || "0";
  const flipX = layer?.flipX ?? false;
  const flipY = layer?.flipY ?? false;

  const shapeOptions = DECOR_SHAPE_PRESETS.map((s) => ({
    value: s,
    label: SHAPE_LABELS[s]?.ar || s,
  }));

  const placementOptions = DECOR_PLACEMENT_PRESETS.map((p) => ({
    value: p,
    label: p === "top" ? "أعلى" : p === "bottom" ? "أسفل" : p === "left" ? "يسار" : p === "right" ? "يمين" : "خلفية",
  }));

  const sizeOptions = DECOR_SIZE_PRESETS.map((s) => ({
    value: s,
    label: s.toUpperCase(),
  }));

  const colorOptions = DECOR_COLOR_PRESETS.map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
      <div className="text-sm font-semibold text-white">{label}</div>

      <FieldGroup label="الشكل" labelAr="Shape">
        <Select
          value={shape}
          onChange={(v) => onChange({ ...layer, shape: v as DecorShapePreset })}
          options={shapeOptions}
        />
      </FieldGroup>

      {shape !== "none" && (
        <>
          <FieldGroup label="الموضع" labelAr="Placement">
            <Select
              value={placement}
              onChange={(v) => onChange({ ...layer, placement: v as DecorPlacementPreset })}
              options={placementOptions}
            />
          </FieldGroup>

          <FieldGroup label="الحجم" labelAr="Size">
            <ButtonGroup
              value={size}
              onChange={(v) => onChange({ ...layer, size: v as DecorSizePreset })}
              options={sizeOptions}
            />
          </FieldGroup>

          <FieldGroup label="اللون" labelAr="Color">
            <Select
              value={color}
              onChange={(v) => onChange({ ...layer, color: v as DecorColorPreset })}
              options={colorOptions}
            />
          </FieldGroup>

          {color === "custom" && (
            <FieldGroup label="لون مخصص" labelAr="Custom Color">
              <Input
                value={layer?.customColor || "#6FA6A1"}
                onChange={(v) => onChange({ ...layer, customColor: v })}
                dir="ltr"
              />
            </FieldGroup>
          )}

          <FieldGroup label="الشفافية" labelAr="Opacity">
            <Slider
              value={Number(opacity)}
              onChange={(v) => onChange({ ...layer, opacity: String(v) as any })}
              min={10}
              max={100}
              step={10}
              suffix="%"
            />
          </FieldGroup>

          <FieldGroup label="الضبابية" labelAr="Blur">
            <ButtonGroup
              value={blur}
              onChange={(v) => onChange({ ...layer, blur: v as DecorBlurPreset })}
              options={[
                { value: "0", label: "بدون" },
                { value: "sm", label: "خفيف" },
                { value: "md", label: "متوسط" },
                { value: "lg", label: "قوي" },
              ]}
            />
          </FieldGroup>

          <div className="flex gap-4">
            <Toggle
              checked={flipX}
              onChange={(v) => onChange({ ...layer, flipX: v })}
              label="قلب أفقي"
            />
            <Toggle
              checked={flipY}
              onChange={(v) => onChange({ ...layer, flipY: v })}
              label="قلب عمودي"
            />
          </div>
        </>
      )}
    </div>
  );
}

function DecorationsEditor({
  decor,
  onChange,
}: {
  decor?: TwTokens["decor"];
  onChange: (d: TwTokens["decor"]) => void;
}) {
  return (
    <div className="space-y-4">
      <DecorationLayerEditor
        layer={decor?.before}
        onChange={(l) => onChange({ ...decor, before: l })}
        label="⬆️ زخرفة علوية"
      />
      <DecorationLayerEditor
        layer={decor?.after}
        onChange={(l) => onChange({ ...decor, after: l })}
        label="⬇️ زخرفة سفلية"
      />
    </div>
  );
}

// ============================================================
// SPACING EDITOR
// ============================================================

function SpacingEditor({
  spacing,
  onChange,
}: {
  spacing?: TwTokens["spacing"];
  onChange: (s: TwTokens["spacing"]) => void;
}) {
  const paddingOptions = [
    { value: "none", label: "بدون" },
    { value: "xs", label: "XS" },
    { value: "sm", label: "SM" },
    { value: "md", label: "MD" },
    { value: "lg", label: "LG" },
    { value: "xl", label: "XL" },
    { value: "2xl", label: "2XL" },
  ];

  return (
    <div className="space-y-4">
      <FieldGroup label="الحشوة العمودية" labelAr="Padding Y">
        <ButtonGroup
          value={spacing?.paddingY || "md"}
          onChange={(v) => onChange({ ...spacing, paddingY: v as any })}
          options={paddingOptions}
        />
      </FieldGroup>

      <FieldGroup label="الحشوة الأفقية" labelAr="Padding X">
        <ButtonGroup
          value={spacing?.paddingX || "md"}
          onChange={(v) => onChange({ ...spacing, paddingX: v as any })}
          options={paddingOptions}
        />
      </FieldGroup>

      <FieldGroup label="المسافة بين العناصر" labelAr="Gap">
        <ButtonGroup
          value={spacing?.gap || "md"}
          onChange={(v) => onChange({ ...spacing, gap: v as any })}
          options={paddingOptions}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================
// ADVANCED EDITOR
// ============================================================

function AdvancedEditor({
  tokens,
  onChange,
}: {
  tokens?: TwTokens;
  onChange: (t: TwTokens) => void;
}) {
  const bgOptions = [
    { value: "none", label: "بدون" },
    { value: "solid-paper", label: "ورقي" },
    { value: "solid-surface", label: "سطح" },
    { value: "solid-accent", label: "مميز" },
    { value: "solid-gold", label: "ذهبي" },
    { value: "gradient-accent", label: "تدرج مميز" },
    { value: "gradient-goldlux", label: "تدرج ذهبي" },
    { value: "glass-md", label: "زجاجي" },
  ];

  const radiusOptions = [
    { value: "none", label: "بدون" },
    { value: "md", label: "متوسط" },
    { value: "lg", label: "كبير" },
    { value: "xl", label: "XL" },
    { value: "2xl", label: "2XL" },
    { value: "3xl", label: "3XL" },
  ];

  const shadowOptions = [
    { value: "none", label: "بدون" },
    { value: "sm", label: "خفيف" },
    { value: "md", label: "متوسط" },
    { value: "lg", label: "كبير" },
    { value: "xl", label: "XL" },
    { value: "glow", label: "توهج" },
  ];

  const textColorOptions = TEXT_COLOR_PRESETS.map((c) => ({
    value: c,
    label: c,
  }));

  const customBg = tokens?.style?.bgCustom ?? "";
  const customText = tokens?.typography?.colorCustom ?? "";
  const customBgColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customBg) ? customBg : "#000000";
  const customTextColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customText) ? customText : "#ffffff";

  const [gradFrom, setGradFrom] = useState("#6FA6A1");
  const [gradTo, setGradTo] = useState("#C6A75E");
  const [gradDir, setGradDir] = useState("to right");

  useEffect(() => {
    const parsed = parseLinearGradient(customBg);
    if (!parsed) return;
    setGradFrom(parsed.from);
    setGradTo(parsed.to);
    setGradDir(parsed.dir);
  }, [customBg]);

  const applyGradient = (next?: { from?: string; to?: string; dir?: string }) => {
    const from = next?.from ?? gradFrom;
    const to = next?.to ?? gradTo;
    const dir = next?.dir ?? gradDir;
    const value = `linear-gradient(${dir}, ${from}, ${to})`;
    onChange({ ...tokens, style: { ...tokens?.style, bgCustom: value } });
  };

  return (
    <div className="space-y-4">
      <FieldGroup label="الخلفية" labelAr="Background">
        <Select
          value={tokens?.style?.bg || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, bg: v as any } })}
          options={bgOptions}
        />
      </FieldGroup>

      <FieldGroup label="خلفية مخصصة" labelAr="Custom Background">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={customBgColor}
            onChange={(e) => onChange({ ...tokens, style: { ...tokens?.style, bgCustom: e.target.value } })}
            className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
            title="Custom background color"
          />
          <div className="flex-1 min-w-[200px]">
            <Input
              value={customBg}
              onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, bgCustom: v } })}
              dir="ltr"
              placeholder="#0b0b0b or linear-gradient(...)"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...tokens, style: { ...tokens?.style, bgCustom: "" } })}
          >
            مسح
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup label="مُنشئ التدرج" labelAr="Gradient Builder">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Select
            value={gradDir}
            onChange={(v) => {
              setGradDir(v);
              applyGradient({ dir: v });
            }}
            options={[
              { value: "to right", label: "يمين" },
              { value: "to left", label: "يسار" },
              { value: "to bottom", label: "أسفل" },
              { value: "to top", label: "أعلى" },
              { value: "135deg", label: "قطري" },
            ]}
          />
          <input
            type="color"
            value={gradFrom}
            onChange={(e) => {
              setGradFrom(e.target.value);
              applyGradient({ from: e.target.value });
            }}
            className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
            title="Gradient start"
          />
          <input
            type="color"
            value={gradTo}
            onChange={(e) => {
              setGradTo(e.target.value);
              applyGradient({ to: e.target.value });
            }}
            className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
            title="Gradient end"
          />
        </div>
      </FieldGroup>

      <Divider title="النص" />

      <FieldGroup label="لون النص" labelAr="Text Color">
        <Select
          value={tokens?.typography?.color || "default"}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, color: v as any } })}
          options={textColorOptions}
        />
      </FieldGroup>

      <FieldGroup label="لون نص مخصص" labelAr="Custom Text Color">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={customTextColor}
            onChange={(e) => onChange({ ...tokens, typography: { ...tokens?.typography, colorCustom: e.target.value } })}
            className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
            title="Custom text color"
          />
          <div className="flex-1 min-w-[200px]">
            <Input
              value={customText}
              onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, colorCustom: v } })}
              dir="ltr"
              placeholder="#ffffff"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...tokens, typography: { ...tokens?.typography, colorCustom: "" } })}
          >
            مسح
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup label="الزوايا" labelAr="Border Radius">
        <ButtonGroup
          value={tokens?.style?.radius || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, radius: v as any } })}
          options={radiusOptions}
        />
      </FieldGroup>

      <FieldGroup label="الظل" labelAr="Shadow">
        <ButtonGroup
          value={tokens?.style?.shadow || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, shadow: v as any } })}
          options={shadowOptions}
        />
      </FieldGroup>

      <Divider title="الحدود" />

      <FieldGroup label="عرض الحدود" labelAr="Border Width">
        <ButtonGroup
          value={tokens?.style?.borderWidth || "0"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, borderWidth: v as any } })}
          options={[
            { value: "0", label: "بدون" },
            { value: "1", label: "1px" },
            { value: "2", label: "2px" },
            { value: "4", label: "4px" },
          ]}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SectionStylingPanel({
  tokens = {},
  onChange,
  className,
}: SectionStylingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("motion");

  const updateTokens = (updates: Partial<TwTokens>) => {
    onChange({ ...tokens, ...updates });
  };

  return (
    <div className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h3 className="font-semibold text-white">تنسيق القسم</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/[0.08] bg-white/[0.01] overflow-x-auto whitespace-nowrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 shrink-0",
              activeTab === tab.id
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "motion" && (
          <MotionEditor
            motion={tokens.motion}
            onChange={(m) => updateTokens({ motion: m })}
          />
        )}
        {activeTab === "decorations" && (
          <DecorationsEditor
            decor={tokens.decor}
            onChange={(d) => updateTokens({ decor: d })}
          />
        )}
        {activeTab === "spacing" && (
          <SpacingEditor
            spacing={tokens.spacing}
            onChange={(s) => updateTokens({ spacing: s })}
          />
        )}
        {activeTab === "advanced" && (
          <AdvancedEditor
            tokens={tokens}
            onChange={updateTokens}
          />
        )}
      </div>
    </div>
  );
}

export default SectionStylingPanel;
