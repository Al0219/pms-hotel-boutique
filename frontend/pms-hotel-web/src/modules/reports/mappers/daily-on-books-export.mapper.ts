import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { DailyOnBooksExportDto } from "../dtos/daily-on-books-export.dto";
import type { DailyOnBooksExport } from "../model/daily-on-books-export";

export function mapDailyOnBooksExport(dto: DailyOnBooksExportDto, from: string, to: string): DailyOnBooksExport {
  const filename = `on-books-daily_${from}_${to}.csv`;
  if (!dto || !/^text\/csv\s*;\s*charset=utf-8$/i.test(dto.contentType ?? "") ||
      dto.disposition !== `attachment; filename="${filename}"` || !dto.body || !Number.isSafeInteger(dto.body.size) || dto.body.size <= 0 || typeof dto.body.slice !== "function" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new DomainMappingError("INVALID_ON_BOOKS_EXPORT");
  }
  return { content: dto.body, filename };
}
