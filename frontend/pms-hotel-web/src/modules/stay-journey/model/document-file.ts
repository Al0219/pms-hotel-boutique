export interface DocumentFile {documentId:string;pdfBase64:string;sha256:string;createdAt:string}
export function mapDocumentFile(value:unknown,expected:string):DocumentFile{
 if(!value||typeof value!=='object')throw new Error('Invalid PDF');const r=value as Record<string,unknown>;
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(expected)||r.documentId!==expected||typeof r.pdfBase64!=='string'||!r.pdfBase64.startsWith('JVBERi0')||r.pdfBase64.length>12000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(r.pdfBase64)||typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))throw new Error('Invalid PDF');
 return{documentId:expected,pdfBase64:r.pdfBase64,sha256:r.sha256,createdAt:r.createdAt};
}
