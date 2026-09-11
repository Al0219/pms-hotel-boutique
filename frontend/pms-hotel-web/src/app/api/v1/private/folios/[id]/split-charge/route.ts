import { NextResponse } from "next/server";

import { mockGuestFolioDto } from "@/data/mocks/handlers";
import type {
  FolioDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
} from "@/modules/folio";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as SplitChargeRequestDto;

  if (body.charge_id === "error_charge") {
    return NextResponse.json({ error: "Split Failed" }, { status: 500 });
  }

  const createdCharges = body.portions.map((p, idx) => ({
    charge_id: `chg_split_${Date.now()}_${idx + 1}`,
    category: "RESTAURANT" as const,
    description: p.description || `Porción dividida ${idx + 1}`,
    amount: p.amount,
    currency: "USD",
    posted_at: new Date().toISOString(),
    posted_by: "staff_frontdesk",
    original_split_charge_id: body.charge_id,
  }));

  const remainingCharges = mockGuestFolioDto.charges.filter((c) => c.charge_id !== body.charge_id);
  const updatedCharges = [...remainingCharges, createdCharges[0]];

  const totalChargesNum = updatedCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaymentsNum = mockGuestFolioDto.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const updatedSourceFolio: FolioDto = {
    ...mockGuestFolioDto,
    folio_id: id,
    charges: updatedCharges,
    total_charges: totalChargesNum.toFixed(2),
    balance: (totalChargesNum - totalPaymentsNum).toFixed(2),
  };

  const response: SplitChargeResultDto = {
    original_charge_id: body.charge_id,
    source_folio_id: id,
    created_charges: createdCharges,
    updated_source_folio: updatedSourceFolio,
  };

  return NextResponse.json(response);
}
