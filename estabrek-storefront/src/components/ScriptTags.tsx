import React from "react";

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeScripts(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return [input];
}

export function ScriptTags({ scripts }: { scripts: any }) {
  const items = normalizeScripts(scripts);
  if (!items.length) return null;

  return (
    <>
      {items.map((it, idx) => {
        if (typeof it === "string") {
          // treat as src
          return <script key={idx} src={it} />;
        }
        if (isPlainObject(it)) {
          if (typeof it.src === "string") {
            return (
              <script
                key={idx}
                src={it.src}
                async={!!it.async}
                defer={!!it.defer}
                crossOrigin={it.crossOrigin}
              />
            );
          }
          if (typeof it.code === "string") {
            return <script key={idx} dangerouslySetInnerHTML={{ __html: it.code }} />;
          }
          if (typeof it.html === "string") {
            // Expect raw JS code without wrapping <script> tags.
            return <script key={idx} dangerouslySetInnerHTML={{ __html: it.html }} />;
          }
        }
        return null;
      })}
    </>
  );
}
