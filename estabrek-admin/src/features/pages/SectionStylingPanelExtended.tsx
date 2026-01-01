// ============================================================
// ESTABREK SECTION STYLING PANEL - MEGA EXTENDED
// ============================================================
// Complete visual editor with 7 tabs and 100+ options
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
  BG_PRESETS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  TEXT_COLOR_PRESETS,
  PADDING_PRESETS,
  GAP_PRESETS,
  MARGIN_PRESETS,
  TEXT_SIZE_PRESETS,
  FONT_WEIGHT_PRESETS,
  TEXT_ALIGN_PRESETS,
  HOVER_PRESETS,
  type TwTokens,
  type AnimPreset,
  type DecorLayer,
  type MotionConfig,
} from "../../cms/style/tokens";
import {
  TEXT_EFFECT_PRESETS,
  CARD_TEMPLATE_PRESETS,
  HOVER_PRESETS_EXTENDED,
  LOADER_PRESETS,
  TEXT_EFFECT_LABELS,
  CARD_TEMPLATE_LABELS,
  HOVER_LABELS,
  type TextEffectPreset,
  type CardTemplatePreset,
  type HoverPresetExtended,
  type TwTokensExtended,
} from "../../cms/style/tokens-extended";

// ============================================================
// TYPES
// ============================================================

interface SectionStylingPanelProps {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (tokens: TwTokens & TwTokensExtended) => void;
  className?: string;
}

type TabId = "layout" | "spacing" | "typography" | "motion" | "decorations" | "effects" | "advanced";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "layout", label: "التخطيط", icon: "📐" },
  { id: "spacing", label: "المسافات", icon: "↔️" },
  { id: "typography", label: "الخط", icon: "✏️" },
  { id: "motion", label: "الحركة", icon: "✨" },
  { id: "decorations", label: "الزخارف", icon: "🌊" },
  { id: "effects", label: "التأثيرات", icon: "🎨" },
  { id: "advanced", label: "متقدم", icon: "⚙️" },
];

// ============================================================
// HELPER COMPONENTS
// ============================================================

function FieldGroup({ label, labelAr, hint, children, className }: {
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

function Slider({ value, onChange, min = 0, max = 100, step = 1, suffix = "" }: {
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
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <span className="text-sm font-medium text-white min-w-[3rem] text-center">{value}{suffix}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }: {
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
        <span className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} style={{ marginTop: "2px" }} />
      </button>
      <span className="text-sm text-white">{label}</span>
    </label>
  );
}

function ButtonGroup({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
            value === opt.value ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
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

function ColorPicker({ value, onChange, label }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-white/70">{label}</span>}
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1 cursor-pointer"
      />
      <Input
        value={value || ""}
        onChange={(v) => onChange(v)}
        dir="ltr"
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  );
}

// ============================================================
// LAYOUT EDITOR
// ============================================================

function LayoutEditor({ tokens, onChange }: {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (t: TwTokens & TwTokensExtended) => void;
}) {
  const bgOptions = BG_PRESETS.map(p => ({ value: p, label: p.replace(/-/g, " ") }));
  const radiusOptions = RADIUS_PRESETS.map(p => ({ value: p, label: p }));
  const shadowOptions = SHADOW_PRESETS.map(p => ({ value: p, label: p }));

  return (
    <div className="space-y-4">
      <FieldGroup label="الخلفية" labelAr="Background">
        <Select
          value={tokens?.style?.bg || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, bg: v as any } })}
          options={bgOptions}
        />
      </FieldGroup>

      <FieldGroup label="خلفية مخصصة" labelAr="Custom BG">
        <ColorPicker
          value={tokens?.style?.bgCustom || ""}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, bgCustom: v } })}
        />
      </FieldGroup>

      <FieldGroup label="الزوايا" labelAr="Border Radius">
        <ButtonGroup
          value={tokens?.style?.radius || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, radius: v as any } })}
          options={radiusOptions.slice(0, 6).map(o => ({ value: o.value, label: o.label }))}
        />
      </FieldGroup>

      <FieldGroup label="الظل" labelAr="Shadow">
        <ButtonGroup
          value={tokens?.style?.shadow || "none"}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, shadow: v as any } })}
          options={shadowOptions.slice(0, 6).map(o => ({ value: o.value, label: o.label }))}
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

      <FieldGroup label="لون الحدود مخصص">
        <ColorPicker
          value={tokens?.style?.borderCustomColor || ""}
          onChange={(v) => onChange({ ...tokens, style: { ...tokens?.style, borderCustomColor: v } })}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================
// SPACING EDITOR
// ============================================================

function SpacingEditor({ tokens, onChange }: {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (t: TwTokens & TwTokensExtended) => void;
}) {
  const paddingOptions = PADDING_PRESETS.map(p => ({ value: p, label: p }));
  const gapOptions = GAP_PRESETS.map(p => ({ value: p, label: p }));
  const marginOptions = MARGIN_PRESETS.map(p => ({ value: p, label: p }));

  return (
    <div className="space-y-4">
      <FieldGroup label="الحشو الداخلي" labelAr="Padding">
        <ButtonGroup
          value={tokens?.spacing?.padding || "none"}
          onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, padding: v as any } })}
          options={paddingOptions.map(o => ({ value: o.value, label: o.label }))}
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="حشو أفقي" labelAr="Padding X">
          <Select
            value={tokens?.spacing?.paddingX || "none"}
            onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, paddingX: v as any } })}
            options={paddingOptions}
          />
        </FieldGroup>
        <FieldGroup label="حشو عمودي" labelAr="Padding Y">
          <Select
            value={tokens?.spacing?.paddingY || "none"}
            onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, paddingY: v as any } })}
            options={paddingOptions}
          />
        </FieldGroup>
      </div>

      <Divider title="الهوامش" />

      <FieldGroup label="الهامش" labelAr="Margin">
        <ButtonGroup
          value={tokens?.spacing?.margin || "none"}
          onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, margin: v as any } })}
          options={marginOptions.slice(0, 6).map(o => ({ value: o.value, label: o.label }))}
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="هامش علوي">
          <Select
            value={tokens?.spacing?.marginTop || "none"}
            onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, marginTop: v as any } })}
            options={marginOptions}
          />
        </FieldGroup>
        <FieldGroup label="هامش سفلي">
          <Select
            value={tokens?.spacing?.marginBottom || "none"}
            onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, marginBottom: v as any } })}
            options={marginOptions}
          />
        </FieldGroup>
      </div>

      <Divider title="الفجوات" />

      <FieldGroup label="الفجوة" labelAr="Gap">
        <ButtonGroup
          value={tokens?.spacing?.gap || "none"}
          onChange={(v) => onChange({ ...tokens, spacing: { ...tokens?.spacing, gap: v as any } })}
          options={gapOptions.map(o => ({ value: o.value, label: o.label }))}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================
// TYPOGRAPHY EDITOR
// ============================================================

function TypographyEditor({ tokens, onChange }: {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (t: TwTokens & TwTokensExtended) => void;
}) {
  const sizeOptions = TEXT_SIZE_PRESETS.map(p => ({ value: p, label: p }));
  const weightOptions = FONT_WEIGHT_PRESETS.map(p => ({ value: p, label: p }));
  const alignOptions = TEXT_ALIGN_PRESETS.map(p => ({ value: p, label: p === "right" ? "يمين" : p === "left" ? "يسار" : p === "center" ? "وسط" : "ضبط" }));
  const colorOptions = TEXT_COLOR_PRESETS.map(p => ({ value: p, label: p }));

  return (
    <div className="space-y-4">
      <FieldGroup label="حجم الخط" labelAr="Font Size">
        <ButtonGroup
          value={tokens?.typography?.size || "base"}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, size: v as any } })}
          options={sizeOptions.slice(0, 8).map(o => ({ value: o.value, label: o.label }))}
        />
      </FieldGroup>

      <FieldGroup label="وزن الخط" labelAr="Font Weight">
        <ButtonGroup
          value={tokens?.typography?.weight || "normal"}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, weight: v as any } })}
          options={[
            { value: "light", label: "خفيف" },
            { value: "normal", label: "عادي" },
            { value: "medium", label: "متوسط" },
            { value: "semibold", label: "شبه سميك" },
            { value: "bold", label: "سميك" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="محاذاة النص" labelAr="Text Align">
        <ButtonGroup
          value={tokens?.typography?.align || "right"}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, align: v as any } })}
          options={alignOptions}
        />
      </FieldGroup>

      <FieldGroup label="لون النص" labelAr="Text Color">
        <Select
          value={tokens?.typography?.color || "default"}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, color: v as any } })}
          options={colorOptions}
        />
      </FieldGroup>

      <FieldGroup label="لون نص مخصص">
        <ColorPicker
          value={tokens?.typography?.colorCustom || ""}
          onChange={(v) => onChange({ ...tokens, typography: { ...tokens?.typography, colorCustom: v } })}
        />
      </FieldGroup>

      <Divider title="تأثيرات النص" />

      <FieldGroup label="تأثير النص" labelAr="Text Effect" hint="50+ تأثير نص جاهز">
        <Select
          value={tokens?.textEffect || "none"}
          onChange={(v) => onChange({ ...tokens, textEffect: v as TextEffectPreset })}
          options={TEXT_EFFECT_PRESETS.map(p => ({
            value: p,
            label: TEXT_EFFECT_LABELS[p]?.ar || p,
          }))}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================
// MOTION EDITOR
// ============================================================

function MotionEditor({ motion, onChange }: {
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
      <FieldGroup label="نوع الحركة" labelAr="Animation Preset" hint="30+ حركة GSAP">
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
              onChange={(v) => onChange({ ...motion, easing: v as any })}
              options={easingOptions}
            />
          </FieldGroup>

          <FieldGroup label="التتابع" labelAr="Stagger">
            <Slider
              value={stagger}
              onChange={(v) => onChange({ ...motion, stagger: v })}
              min={0}
              max={0.5}
              step={0.05}
              suffix="s"
            />
          </FieldGroup>

          <FieldGroup label="عتبة الظهور" labelAr="Threshold">
            <Slider
              value={threshold}
              onChange={(v) => onChange({ ...motion, threshold: v })}
              min={0}
              max={1}
              step={0.1}
            />
          </FieldGroup>

          <Toggle
            checked={once}
            onChange={(v) => onChange({ ...motion, once: v })}
            label="مرة واحدة فقط"
          />

          <Toggle
            checked={motion?.scrub ?? false}
            onChange={(v) => onChange({ ...motion, scrub: v })}
            label="ربط بالتمرير (Scrub)"
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// DECORATIONS EDITOR
// ============================================================

function DecorationsEditor({ decor, onChange }: {
  decor?: { before?: DecorLayer; after?: DecorLayer };
  onChange: (d: { before?: DecorLayer; after?: DecorLayer }) => void;
}) {
  const shapeOptions = DECOR_SHAPE_PRESETS.map(s => ({
    value: s,
    label: SHAPE_LABELS[s]?.ar || s,
  }));
  const placementOptions = DECOR_PLACEMENT_PRESETS.map(p => ({ value: p, label: p === "top" ? "أعلى" : p === "bottom" ? "أسفل" : p === "left" ? "يسار" : p === "right" ? "يمين" : "خلفية" }));
  const sizeOptions = DECOR_SIZE_PRESETS.map(s => ({ value: s, label: s }));
  const colorOptions = DECOR_COLOR_PRESETS.map(c => ({ value: c, label: c }));

  const renderDecorLayer = (layer: DecorLayer | undefined, key: "before" | "after", label: string) => (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange({ ...decor, [key]: undefined })}
        >
          مسح
        </Button>
      </div>

      <FieldGroup label="الشكل">
        <Select
          value={layer?.shape || "none"}
          onChange={(v) => onChange({ ...decor, [key]: { ...layer, shape: v as any } })}
          options={shapeOptions}
        />
      </FieldGroup>

      {layer?.shape && layer.shape !== "none" && (
        <>
          <FieldGroup label="الموضع">
            <ButtonGroup
              value={layer?.placement || "bottom"}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, placement: v as any } })}
              options={placementOptions}
            />
          </FieldGroup>

          <FieldGroup label="الحجم">
            <ButtonGroup
              value={layer?.size || "md"}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, size: v as any } })}
              options={sizeOptions}
            />
          </FieldGroup>

          <FieldGroup label="اللون">
            <Select
              value={layer?.color || "accent"}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, color: v as any } })}
              options={colorOptions}
            />
          </FieldGroup>

          <FieldGroup label="الشفافية">
            <Slider
              value={parseInt(layer?.opacity || "100")}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, opacity: String(v) as any } })}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </FieldGroup>

          <div className="flex gap-4">
            <Toggle
              checked={layer?.flipX ?? false}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, flipX: v } })}
              label="عكس أفقي"
            />
            <Toggle
              checked={layer?.flipY ?? false}
              onChange={(v) => onChange({ ...decor, [key]: { ...layer, flipY: v } })}
              label="عكس عمودي"
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderDecorLayer(decor?.before, "before", "🔝 الزخرفة العلوية (Before)")}
      {renderDecorLayer(decor?.after, "after", "🔻 الزخرفة السفلية (After)")}
    </div>
  );
}

// ============================================================
// EFFECTS EDITOR (TEXT EFFECTS, CARDS, HOVER)
// ============================================================

function EffectsEditor({ tokens, onChange }: {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (t: TwTokens & TwTokensExtended) => void;
}) {
  const hoverOptions = HOVER_PRESETS_EXTENDED.map(h => ({
    value: h,
    label: HOVER_LABELS[h]?.ar || h,
  }));

  const cardOptions = CARD_TEMPLATE_PRESETS.map(c => ({
    value: c,
    label: CARD_TEMPLATE_LABELS[c]?.ar || c,
  }));

  return (
    <div className="space-y-4">
      <FieldGroup label="تأثير التحويم" labelAr="Hover Effect" hint="40+ تأثير hover">
        <Select
          value={tokens?.hoverExtended || tokens?.state?.hover || "none"}
          onChange={(v) => onChange({ ...tokens, hoverExtended: v as HoverPresetExtended })}
          options={hoverOptions}
        />
      </FieldGroup>

      <Divider title="قوالب البطاقات" />

      <FieldGroup label="قالب البطاقة" labelAr="Card Template" hint="17+ قالب بطاقة">
        <Select
          value={tokens?.cardTemplate || "default"}
          onChange={(v) => onChange({ ...tokens, cardTemplate: v as CardTemplatePreset })}
          options={cardOptions}
        />
      </FieldGroup>

      <Divider title="العداد المتحرك" />

      <Toggle
        checked={tokens?.counter?.enabled ?? false}
        onChange={(v) => onChange({ ...tokens, counter: { ...tokens?.counter, enabled: v } })}
        label="تفعيل العداد"
      />

      {tokens?.counter?.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="من">
            <Input
              type="number"
              value={tokens?.counter?.from ?? 0}
              onChange={(v) => onChange({ ...tokens, counter: { ...tokens?.counter, from: parseInt(v) || 0 } })}
            />
          </FieldGroup>
          <FieldGroup label="إلى">
            <Input
              type="number"
              value={tokens?.counter?.to ?? 100}
              onChange={(v) => onChange({ ...tokens, counter: { ...tokens?.counter, to: parseInt(v) || 100 } })}
            />
          </FieldGroup>
          <FieldGroup label="البادئة">
            <Input
              value={tokens?.counter?.prefix ?? ""}
              onChange={(v) => onChange({ ...tokens, counter: { ...tokens?.counter, prefix: v } })}
              placeholder="₪"
            />
          </FieldGroup>
          <FieldGroup label="اللاحقة">
            <Input
              value={tokens?.counter?.suffix ?? ""}
              onChange={(v) => onChange({ ...tokens, counter: { ...tokens?.counter, suffix: v } })}
              placeholder="+"
            />
          </FieldGroup>
        </div>
      )}

      <Divider title="الكتابة المتحركة" />

      <Toggle
        checked={tokens?.typewriter?.enabled ?? false}
        onChange={(v) => onChange({ ...tokens, typewriter: { ...tokens?.typewriter, enabled: v } })}
        label="تفعيل الكتابة المتحركة"
      />

      {tokens?.typewriter?.enabled && (
        <>
          <FieldGroup label="النصوص (سطر لكل نص)">
            <textarea
              value={(tokens?.typewriter?.texts || []).join("\n")}
              onChange={(e) => onChange({ ...tokens, typewriter: { ...tokens?.typewriter, texts: e.target.value.split("\n").filter(Boolean) } })}
              rows={3}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white"
              placeholder="مطور ويب&#10;مصمم UI/UX&#10;مبرمج React"
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="سرعة الكتابة (ms)">
              <Input
                type="number"
                value={tokens?.typewriter?.speed ?? 100}
                onChange={(v) => onChange({ ...tokens, typewriter: { ...tokens?.typewriter, speed: parseInt(v) || 100 } })}
              />
            </FieldGroup>
            <FieldGroup label="وقت الانتظار (ms)">
              <Input
                type="number"
                value={tokens?.typewriter?.pauseTime ?? 2000}
                onChange={(v) => onChange({ ...tokens, typewriter: { ...tokens?.typewriter, pauseTime: parseInt(v) || 2000 } })}
              />
            </FieldGroup>
          </div>
          <Toggle
            checked={tokens?.typewriter?.loop ?? true}
            onChange={(v) => onChange({ ...tokens, typewriter: { ...tokens?.typewriter, loop: v } })}
            label="تكرار"
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// ADVANCED EDITOR
// ============================================================

function AdvancedEditor({ tokens, onChange }: {
  tokens?: TwTokens & TwTokensExtended;
  onChange: (t: TwTokens & TwTokensExtended) => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup label="CSS مخصص" labelAr="Custom CSS">
        <textarea
          value={(tokens as any)?.customCss || ""}
          onChange={(e) => onChange({ ...tokens, customCss: e.target.value } as any)}
          rows={4}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white font-mono"
          dir="ltr"
          placeholder=".section { /* custom styles */ }"
        />
      </FieldGroup>

      <Divider title="الثبات" />

      <Toggle
        checked={tokens?.sticky?.enabled ?? false}
        onChange={(v) => onChange({ ...tokens, sticky: { ...tokens?.sticky, enabled: v } })}
        label="تفعيل الثبات (Sticky)"
      />

      {tokens?.sticky?.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="المسافة من الأعلى">
            <Input
              value={tokens?.sticky?.top ?? "0"}
              onChange={(v) => onChange({ ...tokens, sticky: { ...tokens?.sticky, top: v } })}
              dir="ltr"
              placeholder="0"
            />
          </FieldGroup>
          <FieldGroup label="Z-Index">
            <Input
              type="number"
              value={tokens?.sticky?.zIndex ?? 50}
              onChange={(v) => onChange({ ...tokens, sticky: { ...tokens?.sticky, zIndex: parseInt(v) || 50 } })}
            />
          </FieldGroup>
        </div>
      )}

      <Divider title="التمرير المتوازي" />

      <Toggle
        checked={tokens?.parallax?.enabled ?? false}
        onChange={(v) => onChange({ ...tokens, parallax: { ...tokens?.parallax, enabled: v } })}
        label="تفعيل Parallax"
      />

      {tokens?.parallax?.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="السرعة">
            <Slider
              value={tokens?.parallax?.speed ?? 0.5}
              onChange={(v) => onChange({ ...tokens, parallax: { ...tokens?.parallax, speed: v } })}
              min={0.1}
              max={2}
              step={0.1}
            />
          </FieldGroup>
          <FieldGroup label="الاتجاه">
            <Select
              value={tokens?.parallax?.direction || "up"}
              onChange={(v) => onChange({ ...tokens, parallax: { ...tokens?.parallax, direction: v as any } })}
              options={[
                { value: "up", label: "أعلى" },
                { value: "down", label: "أسفل" },
                { value: "left", label: "يسار" },
                { value: "right", label: "يمين" },
              ]}
            />
          </FieldGroup>
        </div>
      )}

      <Divider title="إعادة تعيين" />

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => onChange({})}
      >
        🗑️ مسح جميع التنسيقات
      </Button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SectionStylingPanelExtended({
  tokens = {},
  onChange,
  className,
}: SectionStylingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("layout");

  return (
    <div className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h3 className="font-semibold text-white">تنسيق القسم المتقدم</h3>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">100+ خيار</span>
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
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activeTab === "layout" && (
          <LayoutEditor tokens={tokens} onChange={onChange} />
        )}
        {activeTab === "spacing" && (
          <SpacingEditor tokens={tokens} onChange={onChange} />
        )}
        {activeTab === "typography" && (
          <TypographyEditor tokens={tokens} onChange={onChange} />
        )}
        {activeTab === "motion" && (
          <MotionEditor
            motion={tokens.motion}
            onChange={(m) => onChange({ ...tokens, motion: m })}
          />
        )}
        {activeTab === "decorations" && (
          <DecorationsEditor
            decor={tokens.decor}
            onChange={(d) => onChange({ ...tokens, decor: d })}
          />
        )}
        {activeTab === "effects" && (
          <EffectsEditor tokens={tokens} onChange={onChange} />
        )}
        {activeTab === "advanced" && (
          <AdvancedEditor tokens={tokens} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

export default SectionStylingPanelExtended;
