/** Exact property selection for a current, undated Staff report. */
export function parseCurrentMaintenanceQuery(params: URLSearchParams) {
  if ([...params.keys()].some(key => !["propertyId", "scope"].includes(key) || params.getAll(key).length !== 1)) return null;
  if (params.has("propertyId") === params.has("scope")) return null;
  const propertyId = params.get("propertyId"), scope = params.get("scope");
  if ((propertyId !== null && !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(propertyId)) ||
      (scope !== null && scope !== "ALL_PROPERTIES")) return null;
  const query = new URLSearchParams();
  if (propertyId) query.set("propertyId", propertyId);
  else query.set("scope", "ALL_PROPERTIES");
  return { propertyId, query };
}
