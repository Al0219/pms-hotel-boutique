import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { parseAmount, parseCount, parseDay, requiredText } from "@/lib/mapper";

import type { PropertyReportDto } from "../dtos/property-report.dto";
import type { PropertyReport } from "../model/property-report";

export function mapPropertyReport(dto: PropertyReportDto): PropertyReport {
  return {
    propertyId: requiredText(dto.property_id, "INVALID_REPORT_PROPERTY_ID"),
    propertyName: requiredText(dto.property_name, "INVALID_REPORT_PROPERTY_NAME"),
    dateRange: {
      startDate: parseDay(dto.start_date, "INVALID_REPORT_START_DATE"),
      endDate: parseDay(dto.end_date, "INVALID_REPORT_END_DATE"),
    },
    metrics: {
      occupancy: parseAmount(String(dto.metrics.occupancy), "INVALID_REPORT_OCCUPANCY"),
      adr: parseAmount(dto.metrics.adr, "INVALID_REPORT_ADR"),
      revpar: parseAmount(dto.metrics.revpar, "INVALID_REPORT_REVPAR"),
      totalRevenue: parseAmount(dto.metrics.total_revenue, "INVALID_REPORT_TOTAL_REVENUE"),
      roomsSold: parseCount(dto.metrics.rooms_sold, "INVALID_REPORT_ROOMS_SOLD"),
      roomsAvailable: parseCount(dto.metrics.rooms_available, "INVALID_REPORT_ROOMS_AVAILABLE"),
    },
    currency: requiredText(dto.currency, "INVALID_REPORT_CURRENCY"),
    timezone: requiredText(dto.timezone, "INVALID_REPORT_TIMEZONE"),
  };
}
