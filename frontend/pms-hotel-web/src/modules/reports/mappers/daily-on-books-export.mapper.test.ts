import { expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { mapDailyOnBooksExport } from "./daily-on-books-export.mapper";
const from = "2035-01-01", to = "2035-01-03";
const filename = `on-books-daily_${from}_${to}.csv`;
const dto = { body: new Blob(["csv"]), contentType: "text/csv; charset=UTF-8", disposition: `attachment; filename="${filename}"` };
it("maps the binary DTO to a safe download without modifying bytes", () => {
  expect(mapDailyOnBooksExport(dto, from, to)).toEqual({ content: dto.body, filename });
});
it.each([{ contentType: "text/html" }, { disposition: 'attachment; filename="../other.csv"' },
  { disposition: null }, { body: new Blob([]) }, { body: { size: 1 } as Blob }])("rejects invalid file metadata %j", overrides => {
  expect(() => mapDailyOnBooksExport({ ...dto, ...overrides }, from, to)).toThrow(DomainMappingError);
});
