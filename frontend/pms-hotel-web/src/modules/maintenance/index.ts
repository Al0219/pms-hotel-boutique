/**
 * Public API for the maintenance module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { MaintenanceCenter } from "./components/maintenance-center";
export type { MaintenanceOrder, MaintenanceOrderStatus, MaintenanceRoomImpact } from "./model/maintenance-order";
