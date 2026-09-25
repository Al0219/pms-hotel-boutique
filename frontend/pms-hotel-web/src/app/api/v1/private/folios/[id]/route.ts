import { NextResponse } from "next/server";

import { mockGuestFolioDto } from "@/data/mocks/handlers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_folio") {
    return NextResponse.json({ error: "Folio Internal Error" }, { status: 500 });
  }

  if (id === "missing_folio") {
    return NextResponse.json({ error: "Folio Not Found" }, { status: 404 });
  }

  return NextResponse.json({
    ...mockGuestFolioDto,
    folio_id: id,
  });
}
