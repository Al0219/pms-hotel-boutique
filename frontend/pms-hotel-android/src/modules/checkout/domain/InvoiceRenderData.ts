import type {CheckoutContent,Folio} from './Checkout';
/** Presentation input only. Real documents are authorized and sourced from the Backend snapshot. */
export interface InvoiceRenderData{content:CheckoutContent;folio:Folio;departureNoteText?:string;referenceText:string;generatedAt:Date;documentKind?:'PERSISTED';generatedAtText?:string;disclaimer?:string}
