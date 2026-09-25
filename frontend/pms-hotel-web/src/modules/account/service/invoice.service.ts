import { httpRequest } from "@/lib/http/client";
import { getPublicEnvironment } from "@/lib/env";
import type { GuestInvoiceListDTO } from "../dtos/invoice.dto";
/** Mock-only read route; no confirmed Backend API. */
export function getInvoices(accountId: string, signal?: AbortSignal) {
  return httpRequest<GuestInvoiceListDTO>({ path: `/__mock/account/invoices?accountId=${encodeURIComponent(accountId)}`, baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, signal });
}
