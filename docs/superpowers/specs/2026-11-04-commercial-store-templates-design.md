# Commercial store templates

The buyer receives an independent installation on their own server (confirmed by the owner). Extend the existing React admin, Next.js storefront and Express/Prisma backend. The owner explicitly requested many templates and a review of the CMS's commercial readiness.

## Result

- Keep the existing ten shoe templates. Add ten distinct compositions for each of ten categories: fashion, beauty, perfume, jewelry, electronics, gaming, home, coffee, food and kids (110 templates total).
- Reuse the existing section library, with industry-specific names, copy, sample products, illustrations and theme families. Every template must have Arabic, English and Hebrew content, responsive layouts and both theme modes. Sample products are for previews; installed pages use the buyer's catalog. Illustrations are bundled locally and replaceable in the editor.
- Let the setup wizard choose a complete template with an actual page preview. Persist the chosen page tree, theme and store logo atomically with the existing setup. Existing content stays unless the owner explicitly selects replacement, with the existing revision protection.
- Retain ordinary themes and starter pages as an alternative when the storefront's template service is unavailable.
- Record a source-backed readiness review and explain the server configuration for independent installations. Do not change hosting, existing credentials, production data or deploy.

## Approaches and decisions

Duplicating whole stores would make fixes expensive. Only adding more palette variants would leave the current complete-template gap. Extend the current template registry and composable page-tree renderer instead; this is the implementation choice for the requested work. The ten compositions have different openings and content structures, with no more than two shared section shapes within each category. Industry data is maintained separately from layout builders.

## Validation

Verify category coverage, unique IDs, multilingual content, layout variety, contrast, public template endpoints, editor page-tree validation in demo and installed modes, logo validation, and setup persistence. Run the relevant existing suites and TypeScript/build checks. Document any environment limitation, especially database-backed checks.
