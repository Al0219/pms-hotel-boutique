/**
 * Fixtures dev-only para los modulos WEB-3 (rooms, housekeeping, maintenance,
 * concierge, parking-valet, messaging, companies, agencies, groups,
 * integrations, reports).
 * Los DTOs respetan el PROVISIONAL API CONTRACT de cada modulo.
 * Solo se registran en el worker de navegador (browser.ts), nunca en el server de tests.
 */

import { http, HttpResponse } from "msw";

import type { RoomListDto } from "@/modules/rooms/dtos/room.dto";
import type { RoomStatusChangeRequestDto, RoomStatusChangeResultDto } from "@/modules/rooms/dtos/room-status-change.dto";
import type { RoomCleaningListDto } from "@/modules/housekeeping/dtos/room-cleaning.dto";
import type {
  CleaningTransitionRequestDto,
  CleaningTransitionResultDto,
  DiscrepancyResolutionDto,
  DiscrepancyResolutionListDto,
} from "@/modules/housekeeping/dtos/room-cleaning-transition.dto";
import type { MaintenanceOrderListDto } from "@/modules/maintenance/dtos/maintenance-order.dto";
import type { ConciergeTaskListDto } from "@/modules/concierge/dtos/concierge-task.dto";
import type { ValetRequestListDto } from "@/modules/parking-valet/dtos/valet-request.dto";
import type { OperationalMessageListDto } from "@/modules/messaging/dtos/operational-message.dto";
import type { CompanyListDto } from "@/modules/companies/dtos/company.dto";
import type { AgencyListDto } from "@/modules/agencies/dtos/agency.dto";
import type { GroupListDto } from "@/modules/groups/dtos/group.dto";
import type { IntegrationListDto } from "@/modules/integrations/dtos/integration.dto";
import type { PropertyReportListDto } from "@/modules/reports/dtos/property-report.dto";

const BASE = "http://pms.test";

const mockRooms: RoomListDto = {
  rooms: [
    { room_id: "ROOM-101", property_id: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", room_type_label: "Estandar Doble" },
    { room_id: "ROOM-102", property_id: "GT-HB-01", number: "102", floor: "1", status: "ACTIVE", room_type_label: "Estandar Doble" },
    { room_id: "ROOM-103", property_id: "GT-HB-01", number: "103", floor: "1", status: "OOO", room_type_label: "Estandar Doble" },
    { room_id: "ROOM-201", property_id: "GT-HB-01", number: "201", floor: "2", status: "ACTIVE", room_type_label: "Deluxe King" },
    { room_id: "ROOM-202", property_id: "GT-HB-01", number: "202", floor: "2", status: "ACTIVE", room_type_label: "Deluxe King" },
    { room_id: "ROOM-203", property_id: "GT-HB-01", number: "203", floor: "2", status: "ACTIVE", room_type_label: "Deluxe King" },
    { room_id: "ROOM-204", property_id: "GT-HB-01", number: "204", floor: "2", status: "OOS", room_type_label: "Deluxe King" },
    { room_id: "ROOM-301", property_id: "GT-HB-01", number: "301", floor: "3", status: "ACTIVE", room_type_label: "Suite Jardin" },
    { room_id: "ROOM-302", property_id: "GT-HB-01", number: "302", floor: "3", status: "ACTIVE", room_type_label: "Suite Jardin" },
    { room_id: "ROOM-401", property_id: "GT-HB-01", number: "401", floor: "4", status: "ACTIVE", room_type_label: "Master Suite Presidencial" },
  ],
};

const mockRoomCleaning: RoomCleaningListDto = {
  rooms: [
    { room_id: "ROOM-101", property_id: "GT-HB-01", room_label: "101", cleaning_status: "DIRTY" },
    { room_id: "ROOM-102", property_id: "GT-HB-01", room_label: "102", cleaning_status: "CLEAN" },
    { room_id: "ROOM-103", property_id: "GT-HB-01", room_label: "103", cleaning_status: "INSPECTED" },
    { room_id: "ROOM-201", property_id: "GT-HB-01", room_label: "201", cleaning_status: "DIRTY" },
    { room_id: "ROOM-202", property_id: "GT-HB-01", room_label: "202", cleaning_status: "CLEAN" },
    { room_id: "ROOM-203", property_id: "GT-HB-01", room_label: "203", cleaning_status: "INSPECTED" },
    { room_id: "ROOM-204", property_id: "GT-HB-01", room_label: "204", cleaning_status: "DIRTY" },
    { room_id: "ROOM-301", property_id: "GT-HB-01", room_label: "301", cleaning_status: "CLEAN" },
    { room_id: "ROOM-302", property_id: "GT-HB-01", room_label: "302", cleaning_status: "DIRTY" },
    { room_id: "ROOM-401", property_id: "GT-HB-01", room_label: "401", cleaning_status: "INSPECTED" },
  ],
};

const mockMaintenanceOrders: MaintenanceOrderListDto = {
  orders: [
    {
      order_id: "OT-2026-001", property_id: "GT-HB-01", room_id: "ROOM-103", title: "Fuga de agua en bano",
      status: "OPEN", room_impact: "OOO",
      history: [
        { status: "OPEN", note: "Reportado por housekeeping durante inspeccion", actor_reference: "staff_hk_01" },
      ],
    },
    {
      order_id: "OT-2026-002", property_id: "GT-HB-01", room_id: "ROOM-204", title: "Aire acondicionado no enfría",
      status: "IN_PROGRESS", room_impact: "OOS",
      history: [
        { status: "OPEN", note: "Queja del huesped suite 204", actor_reference: "staff_front_01" },
        { status: "IN_PROGRESS", note: "Tecnico asignado, repuesto en camino", actor_reference: "staff_maint_01" },
      ],
    },
    {
      order_id: "OT-2026-003", property_id: "GT-HB-01", room_id: "ROOM-301", title: "Falla en cerradura electronica",
      status: "RESOLVED", room_impact: "NONE",
      history: [
        { status: "OPEN", note: "Cerradura no responde a tarjeta", actor_reference: "staff_front_02" },
        { status: "IN_PROGRESS", note: "Tecnico en sitio", actor_reference: "staff_maint_02" },
        { status: "RESOLVED", note: "Cerradura reemplazada y verificada", actor_reference: "staff_maint_02" },
      ],
    },
  ],
};

const mockConciergeTasks: ConciergeTaskListDto = {
  tasks: [
    { task_id: "CONC-001", property_id: "GT-HB-01", title: "Reservar restaurante La Terraza para 20:00", status: "PENDING", reception_reference: null },
    { task_id: "CONC-002", property_id: "GT-HB-01", title: "Coordinar transporte al aeropuerto", status: "IN_PROGRESS", reception_reference: "REF-TRAN-001" },
    { task_id: "CONC-003", property_id: "GT-HB-01", title: "Enviar flores a suite 301", status: "COMPLETED", reception_reference: "REF-FLO-001" },
    { task_id: "CONC-004", property_id: "GT-HB-01", title: "Organizar tour privado a Tikal", status: "PENDING", reception_reference: null },
  ],
};

const mockValetRequests: ValetRequestListDto = {
  requests: [
    { request_id: "VLT-001", property_id: "GT-HB-01", guest_name: "Maria Fernandez", vehicle_description: "Toyota Hilux Blanco, PLN-4521", request_type: "VALET_IN", status: "IN_PROGRESS", parking_space: "A-12", notes: "Llega en 10 min" },
    { request_id: "VLT-002", property_id: "GT-HB-01", guest_name: "Carlos Mendez", vehicle_description: "Honda CR-V Negro, PBC-8834", request_type: "PARKING", status: "COMPLETED", parking_space: "B-05", notes: null },
    { request_id: "VLT-003", property_id: "GT-HB-01", guest_name: "Ana Lucia Rios", vehicle_description: "Mazda CX-5 Rojo, PCK-2210", request_type: "VALET_OUT", status: "PENDING", parking_space: "C-01", notes: "Salida programada 14:00" },
  ],
};

const mockOperationalMessages: OperationalMessageListDto = {
  messages: [
    { message_id: "MSG-001", property_id: "GT-HB-01", subject: "Cambio de toalla en suite 301", body: "Huesped solicita toallas adicionales y cambio de ropa de cama.", sender_role: "CONCIERGE", status: "PENDING", related_reservation_id: "HB-2026-08421", created_at: "2026-09-18T10:30:00.000Z" },
    { message_id: "MSG-002", property_id: "GT-HB-01", subject: "Mantenimiento preventivo piscina", body: "Programar limpieza de filtros y revision de cloro para manana 06:00.", sender_role: "OPERATIONS", status: "IN_PROGRESS", related_reservation_id: null, created_at: "2026-09-18T09:15:00.000Z" },
    { message_id: "MSG-003", property_id: "GT-HB-01", subject: "Check-in tardio suite 401", body: "Huesped Master Suite solicita late checkout hasta 16:00. Aprobado por gerencia.", sender_role: "RECEPTION", status: "RESOLVED", related_reservation_id: "HB-2026-08500", created_at: "2026-09-18T08:00:00.000Z" },
    { message_id: "MSG-004", property_id: "GT-HB-01", subject: "Reporte de ruido piso 3", body: "Queja de huesped 302 por ruido excesivo de la habitacion 301 despues de 23:00.", sender_role: "RECEPTION", status: "PENDING", related_reservation_id: null, created_at: "2026-09-18T23:45:00.000Z" },
  ],
};

const mockCompanies: CompanyListDto = {
  companies: [
    { company_id: "COMP-001", property_id: "GT-HB-01", legal_name: "Corporacion Excel Guatemala S.A.", status_code: "ACTIVE", agreement_reference: "CNV-2026-001", credit_reference: "LINEA-USD-50000", direct_bill_requested: true },
    { company_id: "COMP-002", property_id: "GT-HB-01", legal_name: "Hotelera del Norte S.A.", status_code: "ACTIVE", agreement_reference: "CNV-2026-002", credit_reference: null, direct_bill_requested: false },
    { company_id: "COMP-003", property_id: "GT-HB-01", legal_name: "Tech Solutions Guatemala", status_code: "INACTIVE", agreement_reference: null, credit_reference: null, direct_bill_requested: false },
  ],
};

const mockAgencies: AgencyListDto = {
  agencies: [
    { agency_id: "AG-001", property_id: "GT-HB-01", legal_name: "Viajes Maya S.A.", status_code: "ACTIVE", contract_reference: "CONT-VM-2026", commission_reference: "COM-12PCT", voucher_reference: "VOUCH-VM" },
    { agency_id: "AG-002", property_id: "GT-HB-01", legal_name: "Expedia Guatemala", status_code: "ACTIVE", contract_reference: "CONT-EXP-2026", commission_reference: "COM-15PCT", voucher_reference: null },
    { agency_id: "AG-003", property_id: "GT-HB-01", legal_name: "Booking.com Partner", status_code: "ACTIVE", contract_reference: "CONT-BKG-2026", commission_reference: "COM-18PCT", voucher_reference: "VOUCH-BKG" },
  ],
};

const mockGroups: GroupListDto = {
  groups: [
    { group_id: "GRP-001", property_id: "GT-HB-01", name: "Congreso Medicina Tropical 2026", lifecycle_status: "DEFINITE", room_block_reference: "BLOCK-CMT-2026", audit_reference: "AUD-GRP-001" },
    { group_id: "GRP-002", property_id: "GT-HB-01", name: "Boda Familla Mendez", lifecycle_status: "IN_HOUSE", room_block_reference: "BLOCK-BM-2026", audit_reference: "AUD-GRP-002" },
    { group_id: "GRP-003", property_id: "GT-HB-01", name: "Retiro Corporativo Excel SA", lifecycle_status: "TENTATIVE", room_block_reference: null, audit_reference: null },
    { group_id: "GRP-004", property_id: "GT-HB-01", name: "Conferencia Turismo Sostenible", lifecycle_status: "CLOSED", room_block_reference: "BLOCK-CTS-2025", audit_reference: "AUD-GRP-004" },
  ],
};

const mockIntegrations: IntegrationListDto = {
  integrations: [
    { integration_id: "INT-001", property_id: "GT-HB-01", category: "Channels", provider: "Booking.com", adapter: "ADP-BKG-001", health: "HEALTHY", last_sync: "2026-09-18T14:30:00.000Z", capabilities: ["rate_push", "availability_sync", "reservation_import"] },
    { integration_id: "INT-002", property_id: "GT-HB-01", category: "Channels", provider: "Expedia", adapter: "ADP-EXP-001", health: "ATTENTION", last_sync: "2026-09-18T12:00:00.000Z", capabilities: ["rate_push", "reservation_import"] },
    { integration_id: "INT-003", property_id: "GT-HB-01", category: "Payments", provider: "Stripe", adapter: "ADP-STR-001", health: "HEALTHY", last_sync: "2026-09-18T15:00:00.000Z", capabilities: ["authorize", "capture", "refund", "void"] },
    { integration_id: "INT-004", property_id: "GT-HB-01", category: "POS", provider: "Micros Simphony", adapter: null, health: "CONFIGURED", last_sync: null, capabilities: ["charge_posting"] },
    { integration_id: "INT-005", property_id: "GT-HB-01", category: "Fiscal", provider: "SAT/FEL", adapter: "ADP-FEL-001", health: "HEALTHY", last_sync: "2026-09-18T10:00:00.000Z", capabilities: ["invoice_generation", "credit_note"] },
    { integration_id: "INT-006", property_id: "GT-HB-01", category: "Locks", provider: "Salto Systems", adapter: "ADP-SLT-001", health: "DEGRADED", last_sync: "2026-09-17T23:00:00.000Z", capabilities: ["key_encoding", "access_audit"] },
    { integration_id: "INT-007", property_id: "GT-HB-01", category: "Accounting", provider: "QuickBooks", adapter: null, health: "CONFIGURED", last_sync: null, capabilities: ["journal_export"] },
  ],
};

const mockReports: PropertyReportListDto = {
  reports: [
    {
      property_id: "GT-HB-01", property_name: "Hotel Boutique Granatemala",
      start_date: "2026-09-01", end_date: "2026-09-17",
      metrics: { occupancy: 78.5, adr: "1850.00", revpar: "1452.25", total_revenue: "384250.00", rooms_sold: 208, rooms_available: 265 },
      currency: "GTQ", timezone: "America/Guatemala",
    },
  ],
};

function handleListRooms({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockRooms);
}

function handleListRoomCleaning({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockRoomCleaning);
}

function handleListMaintenanceOrders({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockMaintenanceOrders);
}

function handleListConciergeTasks({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockConciergeTasks);
}

function handleListValetRequests({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockValetRequests);
}

function handleListOperationalMessages({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockOperationalMessages);
}

function handleListCompanies({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockCompanies);
}

function handleListAgencies({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockAgencies);
}

function handleListGroups({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockGroups);
}

function handleListIntegrations({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockIntegrations);
}

function handleListPropertyReports({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  return HttpResponse.json(mockReports);
}

const ALLOWED_CLEANING_TRANSITIONS: Record<string, string[]> = {
  DIRTY: ["CLEAN"],
  CLEAN: ["INSPECTED", "DIRTY"],
  INSPECTED: ["DIRTY"],
};

let discrepancyResolutions: DiscrepancyResolutionDto[] = [];

function handleCleaningTransition({ params, request }: { params: { roomId?: string }; request: Request }) {
  return (async () => {
    const roomId = String(params.roomId);
    const body = (await request.json()) as CleaningTransitionRequestDto;
    const room = mockRoomCleaning.rooms.find((entry) => entry.room_id === roomId);

    if (!room) {
      return HttpResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const allowed = ALLOWED_CLEANING_TRANSITIONS[room.cleaning_status] ?? [];
    if (!allowed.includes(body.to_status)) {
      return HttpResponse.json({ error: "INVALID_TRANSITION" }, { status: 409 });
    }

    if (body.to_status === "DIRTY" && !body.reason?.trim()) {
      return HttpResponse.json({ error: "REASON_REQUIRED" }, { status: 400 });
    }

    room.cleaning_status = body.to_status;
    const result: CleaningTransitionResultDto = {
      room_id: room.room_id,
      property_id: room.property_id,
      cleaning_status: room.cleaning_status,
    };
    return HttpResponse.json(result);
  })();
}

function handleListDiscrepancyResolutions() {
  const result: DiscrepancyResolutionListDto = { resolutions: discrepancyResolutions };
  return HttpResponse.json(result);
}

function handleResolveDiscrepancy({ request }: { request: Request }) {
  return (async () => {
    const body = (await request.json()) as { room_id: string; reason: string };

    if (!body.room_id || !body.reason?.trim()) {
      return HttpResponse.json({ error: "REASON_REQUIRED" }, { status: 400 });
    }

    discrepancyResolutions = discrepancyResolutions.filter((entry) => entry.room_id !== body.room_id);
    discrepancyResolutions.push({
      room_id: body.room_id,
      reason: body.reason.trim(),
      resolved_at: new Date().toISOString(),
    });

    const result: DiscrepancyResolutionListDto = { resolutions: discrepancyResolutions };
    return HttpResponse.json(result);
  })();
}

const ALLOWED_ROOM_STATUS_CHANGES: Record<string, string[]> = {
  ACTIVE: ["OOO", "OOS"],
  OOO: ["ACTIVE", "OOS"],
  OOS: ["ACTIVE", "OOO"],
};

function handleRoomStatusChange({ params, request }: { params: { roomId?: string }; request: Request }) {
  return (async () => {
    const roomId = String(params.roomId);
    const body = (await request.json()) as RoomStatusChangeRequestDto;
    const room = mockRooms.rooms.find((entry) => entry.room_id === roomId);

    if (!room) {
      return HttpResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const allowed = ALLOWED_ROOM_STATUS_CHANGES[room.status] ?? [];
    if (!allowed.includes(body.to_status)) {
      return HttpResponse.json({ error: "INVALID_TRANSITION" }, { status: 409 });
    }

    if (!body.reason?.trim()) {
      return HttpResponse.json({ error: "REASON_REQUIRED" }, { status: 400 });
    }

    const blocking = body.to_status === "OOO" || body.to_status === "OOS";
    if (blocking && (!body.start_date || !body.end_date || body.start_date >= body.end_date)) {
      return HttpResponse.json({ error: "INVALID_PERIOD" }, { status: 400 });
    }

    room.status = body.to_status;
    const result: RoomStatusChangeResultDto = {
      room_id: room.room_id,
      property_id: room.property_id,
      status: room.status,
      blocked_from: blocking ? body.start_date : null,
      blocked_to: blocking ? body.end_date : null,
    };
    return HttpResponse.json(result);
  })();
}

export const web3Handlers = [
  http.get(`${BASE}/rooms`, handleListRooms),
  http.get(`${BASE}/room-cleaning`, handleListRoomCleaning),
  http.get(`${BASE}/maintenance-orders`, handleListMaintenanceOrders),
  http.get(`${BASE}/concierge-tasks`, handleListConciergeTasks),
  http.get(`${BASE}/valet-requests`, handleListValetRequests),
  http.get(`${BASE}/operational-messages`, handleListOperationalMessages),
  http.get(`${BASE}/companies`, handleListCompanies),
  http.get(`${BASE}/agencies`, handleListAgencies),
  http.get(`${BASE}/groups`, handleListGroups),
  http.get(`${BASE}/integrations`, handleListIntegrations),
  http.get(`${BASE}/property-reports`, handleListPropertyReports),
  http.post(`${BASE}/room-cleaning/:roomId/transitions`, handleCleaningTransition),
  http.get(`${BASE}/room-cleaning/discrepancy-resolutions`, handleListDiscrepancyResolutions),
  http.post(`${BASE}/room-cleaning/discrepancy-resolutions`, handleResolveDiscrepancy),
  http.post(`${BASE}/rooms/:roomId/status-change`, handleRoomStatusChange),
];
