package com.pms.hotelboutique.backend.modules.reservations.application;

import java.nio.charset.Charset;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StayDocumentPdfTests {
 private StayJourneyService.Document document(int count){
  var id=UUID.randomUUID();var at=Instant.parse("2026-10-29T20:35:00Z");
  var stay=new StayJourneyService.Stay(id,id,id,"QA-DESIGN","CHECKED_OUT",at,id,LocalDate.parse("2026-10-29"),LocalDate.parse("2026-10-30"),"America/Guatemala");
  var lines=new ArrayList<StayJourneyService.Line>();
  for(int i=0;i<count;i++)lines.add(new StayJourneyService.Line(UUID.randomUUID(),i%2==0?"CHARGE":"PAYMENT","Movimiento "+i+" · Habitación (jardín) \\ café", "650.00",at));
  var summary=new StayJourneyService.Summary(stay,id,"GTQ","0.00","650.00","650.00","0.00",true,0,0,lines,List.of(),id,"Documento informativo — sin validez fiscal");
  return new StayJourneyService.Document(id,at,summary);
 }
 @Test void rendersProfessionalInvoiceFromSnapshotWithSpanishAmountsAndDates() throws Exception {
  var doc=document(2);byte[] pdf=StayDocumentPdf.render(doc,Instant.parse("2026-10-29T20:40:00Z"));
  var text=new String(pdf,Charset.forName("windows-1252"));
  for(String value:List.of("HOTEL BOUTIQUE","Detalles de la estancia","QA-DESIGN","29/10/2026 14:40","Total de cargos","Pagos acumulados","Saldo restante","Documento informativo — sin validez fiscal","Q. 650.00"))assertTrue(text.contains(value),value);
  assertTrue(text.contains("Habitación \\(jardín\\) \\\\"));
  java.nio.file.Files.write(java.nio.file.Path.of("target/stay-layout-qa.pdf"),pdf);
 }
 @Test void paginatesWithoutLosingMovementsOrFinalTotals() throws Exception {
  byte[] pdf=StayDocumentPdf.render(document(120),Instant.parse("2026-10-29T20:40:00Z"));var text=new String(pdf,Charset.forName("windows-1252"));
  for(int i=0;i<120;i++)assertTrue(text.contains("Movimiento "+i+" ·"),"Lost movement "+i);
  assertTrue(text.contains("Saldo restante"));assertTrue(text.contains("Página 3 de "));assertTrue(text.endsWith("%%EOF"));
  java.nio.file.Files.write(java.nio.file.Path.of("target/stay-layout-pages-qa.pdf"),pdf);
 }
}
