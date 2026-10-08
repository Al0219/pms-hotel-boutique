import { AvailabilityResults } from "@/modules/multi-property";
export default async function AvailabilityResultsRoute({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; roomType?: string }> }) {
  const params = await searchParams;
  const criteria = typeof params.start === "string" && typeof params.end === "string"
    ? { startDate: params.start, endDate: params.end, roomType: typeof params.roomType === "string" ? params.roomType : "" } : null;
  return <AvailabilityResults criteria={criteria} />;
}
