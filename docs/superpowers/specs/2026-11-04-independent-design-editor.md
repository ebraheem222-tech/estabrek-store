# Independent customer designs

The owner clarified that customers should choose a starting template and edit their own design in the visual editor, like creating a Figma document. Estabrek's original storefront is a separate bespoke design and must not become the default for customers. Each buyer still has an independent installation; this work does not introduce shared SaaS accounts.

The owner further clarified that any catalog design remains available to choose and change, and explicitly requested 300 templates for a Wix/Shopify-like commercial product. The catalog must contain distinct compositions, not ten repeated layouts with different industry copy. Target 20 categories × 15 templates, preserve existing IDs, and test global structural uniqueness independent of text, colours, asset paths and node IDs.

## Behavior

- A new store chooses a template or a blank canvas, supplies its own identity and enters the editor after setup.
- Import the template as ordinary editable content: home page and separate reusable header/footer blocks. The customer edits all three with the existing visual editor, with navigation between those documents.
- Save a validated copy of the design's palette, fonts and theme settings in that customer's settings. Runtime rendering must not require the source template's registry entry. Store the template ID only as provenance.
- Store an explicit independent-design marker. New customer pages use the CMS renderer and their saved header/footer on every route. They must not use Estabrek's Rose home, cinematic shell, hijab imagery, special copy or assistant by default.
- Leave existing unmarked installations, including Estabrek, on their current rendering path. Do not change live data, credentials or deployment.
- Existing pages stay unless the owner explicitly selects replacement. Setup must not silently replace an existing customer header/footer on a later run.
- New stores must not be offered the original Estabrek/Rose design. Ordinary existing themes remain available in the existing store's administration; independently imported designs customize their own copied settings.

## Architecture decisions

Use the existing Page kind `block` for header/footer documents, the existing draft/publish/undo editor and JSON settings for the design snapshot. No Prisma migration is necessary. A public storefront design endpoint resolves only the saved published header/footer, with IDs renamed per region to prevent CSS/node collisions. The storefront layout renders these documents with the same tree renderer. The account/setup flow reuses the existing owner sign-in and automatic empty-store setup.

## Validation

Test snapshot validation and independence from the registry, preserved Estabrek behavior, setup transaction writes and repeated setup protection, public-region publication boundaries, mutable customer copies, template/blank import and editor navigation, and browser rendering of a customer homepage and interior route without the original chrome. Verify relevant existing suites and builds.
