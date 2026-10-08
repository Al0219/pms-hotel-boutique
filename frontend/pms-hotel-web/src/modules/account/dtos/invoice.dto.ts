/** Frontend-only read contract; no fiscal processing. */
export interface GuestInvoiceDTO { id: string; reservation_id: string; issued_on: string; amount_label: string; status_label: string; download_path: string | null }
export interface GuestInvoiceListDTO { account_id: string; invoices: GuestInvoiceDTO[] }
