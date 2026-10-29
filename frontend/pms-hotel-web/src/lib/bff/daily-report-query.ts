/** Shared strict query contract for property-local daily reports. */
export function parseDailyReportQuery(params: URLSearchParams) {
  if ([...params.keys()].some(key => !["from", "to", "propertyId", "scope"].includes(key) || params.getAll(key).length !== 1)) return null;
  const from = params.get("from"), to = params.get("to");
  const day = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  const first = day(from), last = day(to);
  const id = params.get("propertyId"), scope = params.get("scope");
  if (!from || !to || !Number.isFinite(first) || !Number.isFinite(last) || first > last || (last - first) / 86_400_000 >= 366 ||
      params.has("propertyId") === params.has("scope") ||
      (id !== null && !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) ||
      (scope !== null && scope !== "ALL_PROPERTIES")) return null;
  const query = new URLSearchParams({ from, to });
  if (id) query.set("propertyId", id); else query.set("scope", "ALL_PROPERTIES");
  return { from, to, propertyId: id, query };
}
