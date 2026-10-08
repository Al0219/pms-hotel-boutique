import { PublicAvailabilityPage, readBookingPageCriteria } from "@/modules/booking";

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const criteria = readBookingPageCriteria(await searchParams);
  return <PublicAvailabilityPage key={JSON.stringify(criteria)} initialCriteria={criteria} />;
}
