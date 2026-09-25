import { NextResponse } from "next/server";

import type { AvailabilityMatrixResponseDto } from "@/modules/availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id") || "prop_boutique_01";
  const startDate = url.searchParams.get("start_date") || "2026-10-01";
  const endDate = url.searchParams.get("end_date") || "2026-10-07";
  const filterRoomTypeId = url.searchParams.get("room_type_id");

  if (propertyId === "error_property") {
    return NextResponse.json({ error: "Property matrix internal error" }, { status: 500 });
  }

  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  const roomTypes = [
    {
      id: "rt_deluxe_king",
      name: "Deluxe King Suite",
      code: "DLX-KNG",
      physical: 10,
      baseSold: 4,
      ooo: 1,
      oos: 0,
      overbooking: 0,
    },
    {
      id: "rt_exec_double",
      name: "Executive Double Queen",
      code: "EXE-DBL",
      physical: 8,
      baseSold: 3,
      ooo: 0,
      oos: 1,
      overbooking: 0,
    },
    {
      id: "rt_master_suite",
      name: "Master Suite Presidencial",
      code: "MST-STE",
      physical: 4,
      baseSold: 2,
      ooo: 0,
      oos: 0,
      overbooking: 0,
    },
  ];

  const filteredTypes = filterRoomTypeId
    ? roomTypes.filter((rt) => rt.id === filterRoomTypeId)
    : roomTypes;

  const matrix = filteredTypes.map((rt) => {
    const daily = dates.map((d, index) => {
      const sold = Math.min(rt.physical - rt.ooo - rt.oos, rt.baseSold + (index % 3));
      const ats = rt.physical - sold - rt.ooo - rt.oos + rt.overbooking;
      const effectiveCap = Math.max(1, rt.physical - rt.ooo);
      const occupancyRate = Math.round((sold / effectiveCap) * 100);

      return {
        date: d,
        physical_rooms: rt.physical,
        sold_rooms: sold,
        ooo_rooms: rt.ooo,
        oos_rooms: rt.oos,
        overbooking_adjustment: rt.overbooking,
        ats,
        occupancy_rate: occupancyRate,
        stop_sell: ats <= 0,
        min_los: index === 5 ? 2 : 1,
      };
    });

    return {
      room_type_id: rt.id,
      room_type_name: rt.name,
      room_type_code: rt.code,
      total_physical_capacity: rt.physical,
      daily_availability: daily,
    };
  });

  const totalPhysicalRooms = filteredTypes.reduce((sum, rt) => sum + rt.physical, 0);

  const dailySummaries = dates.map((d, index) => {
    let totalPhysical = 0;
    let totalSold = 0;
    let totalOoo = 0;
    let totalOos = 0;
    let totalAts = 0;

    for (const rtMatrix of matrix) {
      const dayData = rtMatrix.daily_availability[index];
      if (dayData) {
        totalPhysical += dayData.physical_rooms;
        totalSold += dayData.sold_rooms;
        totalOoo += dayData.ooo_rooms;
        totalOos += dayData.oos_rooms;
        totalAts += dayData.ats;
      }
    }

    const effCap = Math.max(1, totalPhysical - totalOoo);
    const avgOcc = Math.round((totalSold / effCap) * 100);

    return {
      date: d,
      total_physical: totalPhysical,
      total_sold: totalSold,
      total_ooo: totalOoo,
      total_oos: totalOos,
      total_ats: totalAts,
      average_occupancy_rate: avgOcc,
    };
  });

  const response: AvailabilityMatrixResponseDto = {
    property_id: propertyId,
    start_date: startDate,
    end_date: endDate,
    dates,
    matrix,
    total_property_physical_rooms: totalPhysicalRooms,
    daily_summaries: dailySummaries,
  };

  return NextResponse.json(response);
}
