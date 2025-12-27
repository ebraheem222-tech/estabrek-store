import storefront from "./storefront.routes.js";

/**
 * Backwards-compatible controller entrypoint.
 * Some older code imports `storefront.controller` while the project uses `storefront.routes`.
 */
export default storefront;
