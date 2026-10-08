/**
 * Public API for the properties module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */
export { PropertyProvider, PropertySwitcher, usePropertyScope } from "./components/property-provider";
export { resolvePropertyScope } from "./model/property-scope";
export type { PropertyScope } from "./model/property-scope";
