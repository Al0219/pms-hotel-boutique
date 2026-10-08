import { type CheckoutSessionSnapshot } from '@/modules/checkout/presentation/CheckoutSessionProvider';

export interface InvoiceDocumentResult { uri: string; numberOfPages?: number; }
export interface InvoiceDocumentService {
  generate(snapshot: CheckoutSessionSnapshot): Promise<InvoiceDocumentResult>;
  open(uri: string): Promise<void>;
  share(uri: string): Promise<void>;
}
