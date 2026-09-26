import { AvailabilitySearch } from "@/modules/multi-property";
export default async function AvailabilitySearchRoute({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; roomType?: string }> }) {
  const params = await searchParams;
  const criteria = typeof params.start === "string" && typeof params.end === "string"
    ? { startDate: params.start, endDate: params.end, roomType: typeof params.roomType === "string" ? params.roomType : "" } : undefined;
  return <AvailabilitySearch criteria={criteria} />;
}
