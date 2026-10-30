import { type InvoiceRenderData } from '@/modules/checkout/domain/InvoiceRenderData';

export interface InvoiceDocumentResult { uri: string; numberOfPages?: number; }
export interface InvoiceDocumentService {
  materialize?(file:import('../../domain/DocumentFile').DocumentFile):Promise<InvoiceDocumentResult>;
  generate(snapshot: InvoiceRenderData): Promise<InvoiceDocumentResult>;
  open(uri: string): Promise<void>;
  share(uri: string): Promise<void>;
}
