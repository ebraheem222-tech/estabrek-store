# Selected internal object controls

The screenshot selects the countdown's minute label, but no content field appears and the Looks tab asks for a selection. The label is already classified as text; its renderer has no editable source, and the gallery only accepts native tree nodes.

Restore type-appropriate controls for internal selections. Text, button, image, video and box targets must expose their compatible ready looks, preview and save on that target, and undo normally. Do not offer presets requiring widget props on anonymous parts. Default countdown unit words and before/after labels must bind to validated localized source properties, even in existing documents where those optional properties are absent. Countdown numbers remain live values with a direct route to the owning timer settings. Nested media should expose its actual source field when the renderer declares it. Catalog data and shared regions retain their own editing destinations.

Preserve locale, responsive styles, functional widget state, draft history, public rendering and no full document reload. Never infer content ownership from equal visible text or turn runtime values into fixed content. Verification uses isolated local fixtures and isolated CI PostgreSQL only.
