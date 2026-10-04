import React, { useMemo, useState } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { MediaLibraryModal } from "./MediaLibraryModal";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  allowClear?: boolean;
  showPreview?: boolean;
  /** default: single selection */
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
};

export function MediaUrlInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  allowClear = true,
  showPreview = true,
  multiple,
  onSelectMultiple,
}: Props) {
  const [open, setOpen] = useState(false);

  const has = Boolean(String(value || "").trim());

  const preview = useMemo(() => {
    if (!showPreview || !has) return null;
    // only show for images
    if (!/^https?:\/\//i.test(value) && !value.startsWith("/")) return null;
    return value;
  }, [has, showPreview, value]);

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm font-medium text-white/80">{label}</div> : null}

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} error={error} />
        </div>

        <Button type="button" variant="secondary" className="h-10" onClick={() => setOpen(true)}>
          اختيار
        </Button>

        {allowClear ? (
          <Button type="button" variant="ghost" className="h-10" onClick={() => onChange("")} disabled={!has}>
            مسح
          </Button>
        ) : null}
      </div>

      {preview ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={preview} className="h-40 w-full object-cover" />
        </div>
      ) : null}

      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        multiple={multiple}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
        onSelectMultiple={(urls) => {
          onSelectMultiple?.(urls);
          setOpen(false);
        }}
      />
    </div>
  );
}
