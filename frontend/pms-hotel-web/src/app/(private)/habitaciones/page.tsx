import { RoomBoard } from "@/modules/rooms";

export default function RoomsPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID || "prop-1";
  const endpoint = "http://pms.test/rooms";

  return <RoomBoard propertyId={propertyId} endpoint={endpoint} />;
}
