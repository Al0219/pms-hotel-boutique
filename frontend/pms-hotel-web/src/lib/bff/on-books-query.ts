export { parseDailyReportQuery as parseOnBooksQuery } from "./daily-report-query";

export function acceptsCsv(accept: string | null): boolean {
  if (!accept) return true;
  const matches = accept.split(",").map(part => {
    const [type, ...parameters] = part.trim().toLowerCase().split(";");
    const quality = parameters.find(item => item.trim().startsWith("q="));
    return { specificity: type === "text/csv" ? 2 : type === "text/*" ? 1 : type === "*/*" ? 0 : -1,
      quality: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(item => item.specificity >= 0).sort((a, b) => b.specificity - a.specificity || b.quality - a.quality);
  return Boolean(matches.length && matches[0].quality > 0 && matches[0].quality <= 1);
}
