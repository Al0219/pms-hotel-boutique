import { NextResponse } from "next/server";

import { mockGuestFolioDto } from "@/data/mocks/handlers";
import type {
  FolioDto,
  TransferChargeRequestDto,
  TransferChargeResultDto,
} from "@/modules/folio";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as TransferChargeRequestDto;

  if (body.charge_id === "error_charge") {
    return NextResponse.json({ error: "Transfer Failed" }, { status: 500 });
  }

  const updatedSourceCharges = mockGuestFolioDto.charges.map((c) =>
    c.charge_id === body.charge_id
      ? {
          ...c,
          is_transferred: true,
          transferred_to_folio_id: body.target_folio_id,
          transfer_reason: body.reason,
        }
      : c,
  );

  const activeSourceCharges = updatedSourceCharges.filter((c) => !c.is_transferred && !c.is_voided);
  const totalSourceCharges = activeSourceCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPayments = mockGuestFolioDto.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const updatedSourceFolio: FolioDto = {
    ...mockGuestFolioDto,
    folio_id: id,
    charges: updatedSourceCharges,
    total_charges: totalSourceCharges.toFixed(2),
    balance: (totalSourceCharges - totalPayments).toFixed(2),
  };

  const response: TransferChargeResultDto = {
    transferred_charge_id: body.charge_id,
    source_folio_id: id,
    target_folio_id: body.target_folio_id,
    reason: body.reason,
    transferred_at: new Date().toISOString(),
    updated_source_folio: updatedSourceFolio,
  };

  return NextResponse.json(response);
}
