package com.pms.hotelboutique.backend.modules.reservations.application;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Hotel Boutique's guest invoice layout. Only the first emission renders; stored PDFs never change. */
final class StayDocumentPdf {
 private static final Charset ENCODING=Charset.forName("windows-1252");
 private static final String INK="0.149 0.188 0.169", GREEN="0.212 0.361 0.294", MUTED="0.424 0.459 0.435";
 private static byte[] bytes(String s){return s.getBytes(ENCODING);}
 private static String number(double n){return String.format(Locale.ROOT,"%.2f",n);}
 private static String escaped(String s){return s.replaceAll("[\\r\\n\\t]"," ").replace("\\","\\\\").replace("(","\\(").replace(")","\\)");}
 private static double width(String s,double size){double result=0;for(char c:s.toCharArray())result+= "ilI.,:;!'| ".indexOf(c)>=0?.28:"MW@%".indexOf(c)>=0?.9:Character.isUpperCase(c)?.68:.56;return result*size;}
 private static List<String> wrap(String s,double max,double size){
  var result=new ArrayList<String>();StringBuilder line=new StringBuilder();
  for(String word:s.replaceAll("[\\r\\n\\t]"," ").split(" +")){
   if(!line.isEmpty()&&width(line+" "+word,size)>max){result.add(line.toString());line.setLength(0);}
   for(char c:word.toCharArray()){if(width(line.toString()+c,size)>max&&!line.isEmpty()){result.add(line.toString());line.setLength(0);}line.append(c);}
   line.append(' ');
  }if(!line.isEmpty())result.add(line.toString().strip());if(result.isEmpty())result.add("");return result;
 }
 private static final class Page {
  final StringBuilder content=new StringBuilder();
  void text(String value,double x,double top,double size,boolean bold,String color){content.append("BT /").append(bold?"F2":"F1").append(' ').append(number(size)).append(" Tf ").append(color).append(" rg 1 0 0 1 ").append(number(x)).append(' ').append(number(842-top)).append(" Tm (").append(escaped(value)).append(") Tj ET\n");}
  void right(String value,double right,double top,double size,boolean bold,String color){text(value,right-width(value,size),top,size,bold,color);}
  void box(double x,double top,double w,double h,String color){content.append(color).append(" rg ").append(number(x)).append(' ').append(number(842-top-h)).append(' ').append(number(w)).append(' ').append(number(h)).append(" re f\n");}
  void rule(double top,String color,double thickness){box(48,top,499,thickness,color);}
 }
 static byte[] render(StayJourneyService.Document doc,Instant emittedAt){
  var s=doc.snapshot();ZoneId zone=ZoneId.of(s.stay().timezone());var date=DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm",Locale.ROOT).withZone(zone);
  var pages=new ArrayList<Page>();Page p=header(doc,false);pages.add(p);
  p.box(48,126,499,60,"0.961 0.957 0.937");
  p.text("REFERENCIA DEL DOCUMENTO",60,144,8,true,MUTED);p.text(doc.id().toString(),60,164,9,false,INK);
  p.text("EMITIDO",355,144,8,true,MUTED);p.text(date.format(emittedAt),355,164,10,true,INK);
  p.text("Detalles de la estancia",48,217,12,true,GREEN);p.box(48,230,499,77,"0.980 0.976 0.965");
  p.text("RESERVA",60,249,8,true,MUTED);p.text(s.stay().confirmationCode(),60,268,11,true,INK);
  p.text("FECHAS DE ESTANCIA",285,249,8,true,MUTED);p.text(s.stay().arrival()+" — "+s.stay().departure(),285,268,10,true,INK);
  p.text("Salida confirmada · "+date.format(doc.issuedAt()),60,291,9,false,MUTED);
  p.text("Movimientos del folio",48,335,12,true,GREEN);tableHead(p,348);double y=375;
  for(var m:s.movements()){
   var description=wrap(m.description(),310,10);String kind=switch(m.kind()){case "CHARGE"->"Cargo";case "PAYMENT"->"Pago";case "ADJUSTMENT"->"Ajuste";default->m.kind();};
   for(int i=0;i<description.size();i++){
    if(y+28>720){p=header(doc,true);pages.add(p);tableHead(p,126);y=153;}
    if(i==0){p.text(kind,58,y+14,10,true,INK);p.right("Q. "+m.amount(),535,y+14,10,true,INK);}
    p.text(description.get(i),126,y+14,10,false,INK);y+=15;
   }
   y+=10;p.rule(y,"0.890 0.890 0.863",.5);y+=5;
  }
  if(y+175>720){p=header(doc,true);pages.add(p);y=138;}
  y+=18;p.box(305,y,242,2,GREEN);y+=24;
  p.text("Total de cargos",315,y,10,false,MUTED);p.right("Q. "+s.charges(),535,y,11,true,INK);y+=23;
  p.text("Pagos acumulados",315,y,10,false,MUTED);p.right("Q. "+s.payments(),535,y,11,true,INK);y+=23;
  p.text("Ajustes",315,y,10,false,MUTED);p.right("Q. "+s.adjustments(),535,y,11,true,INK);y+=15;
  p.box(305,y,242,38,"0.941 0.945 0.925");p.text("Saldo restante",315,y+25,11,true,GREEN);p.right("Q. "+s.balance(),535,y+25,14,true,GREEN);
  for(int i=0;i<pages.size();i++){
   Page page=pages.get(i);page.rule(752,"0.890 0.890 0.863",.5);
   page.text("Documento informativo — sin validez fiscal",48,770,10,true,GREEN);
   page.text("No constituye comprobante fiscal FEL ni documento certificado por SAT.",48,787,8,false,MUTED);
   page.text("Hotel Boutique · PMS",48,815,8,false,MUTED);page.right("Página "+(i+1)+" de "+pages.size(),547,815,8,false,MUTED);
  }
  return encode(pages);
 }
 private static Page header(StayJourneyService.Document doc,boolean continuation){
  var p=new Page();p.box(48,48,40,40,GREEN);p.text("HB",55,74,17,true,"1 1 1");
  p.text("HOTEL BOUTIQUE",101,65,13,true,INK);p.text("Resumen para huésped",101,83,10,false,MUTED);
  p.right("DOCUMENTO INFORMATIVO",547,65,11,true,GREEN);p.right(continuation?"Reserva "+doc.snapshot().stay().confirmationCode():"Documento definitivo · GTQ",547,83,9,false,MUTED);p.rule(106,GREEN,2);return p;
 }
 private static void tableHead(Page p,double y){p.box(48,y,499,27,"0.941 0.945 0.925");p.text("TIPO",58,y+18,8,true,GREEN);p.text("DESCRIPCIÓN",126,y+18,8,true,GREEN);p.right("IMPORTE",535,y+18,8,true,GREEN);}
 private static byte[] encode(List<Page> pages){
  var objects=new ArrayList<byte[]>();objects.add(bytes("<< /Type /Catalog /Pages 2 0 R >>"));var kids=new StringBuilder();for(int i=0;i<pages.size();i++)kids.append(5+i*2).append(" 0 R ");
  objects.add(bytes("<< /Type /Pages /Kids ["+kids+"] /Count "+pages.size()+" >>"));
  for(String font:List.of("Helvetica","Helvetica-Bold"))objects.add(bytes("<< /Type /Font /Subtype /Type1 /BaseFont /"+font+" /Encoding /WinAnsiEncoding >>"));
  for(int i=0;i<pages.size();i++){
   objects.add(bytes("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents "+(6+i*2)+" 0 R >>"));
   var content=pages.get(i).content;objects.add(bytes("<< /Length "+bytes(content.toString()).length+" >>\nstream\n"+content+"\nendstream"));
  }
  var out=new ByteArrayOutputStream();out.writeBytes(bytes("%PDF-1.4\n"));var offsets=new ArrayList<Integer>();
  for(int i=0;i<objects.size();i++){offsets.add(out.size());out.writeBytes(bytes((i+1)+" 0 obj\n"));out.writeBytes(objects.get(i));out.writeBytes(bytes("\nendobj\n"));}
  int xref=out.size();out.writeBytes(bytes("xref\n0 "+(objects.size()+1)+"\n0000000000 65535 f \n"));for(int offset:offsets)out.writeBytes(bytes(String.format(Locale.ROOT,"%010d 00000 n \n",offset)));
  out.writeBytes(bytes("trailer\n<< /Size "+(objects.size()+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF"));return out.toByteArray();
 }
}
