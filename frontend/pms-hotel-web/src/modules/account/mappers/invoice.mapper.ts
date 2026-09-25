import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { dateOnly, list, text } from "@/lib/validation";
import type { GuestInvoiceListDTO } from "../dtos/invoice.dto";
import type { GuestInvoice } from "../model/invoice";
export function mapInvoices(dto: GuestInvoiceListDTO, accountId: string): GuestInvoice[] {
  if (text(dto.account_id) !== accountId) throw new DomainMappingError("ACCOUNT_SCOPE_MISMATCH");
  return list(dto.invoices).map(invoice => {
    // Mock documents may only use explicit same-origin demo assets, never arbitrary URLs.
    if (invoice.download_path !== null && !/^\/demo-documents\/[a-zA-Z0-9_-]+\.pdf$/.test(invoice.download_path)) throw new DomainMappingError("UNSAFE_DOCUMENT_URL");
    return { id: text(invoice.id), reservationId: text(invoice.reservation_id), issuedOn: dateOnly(invoice.issued_on), amountLabel: text(invoice.amount_label), statusLabel: text(invoice.status_label), downloadPath: invoice.download_path };
  });
}
