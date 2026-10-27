import { fireEvent, render, within } from '@testing-library/react-native';
import * as Native from 'react-native';
import { Text } from 'react-native';
import { ServiceRequestDisclosure, ServiceRequestDisclosureGroup } from '@/modules/service-requests/presentation/ServiceRequestDisclosure';
jest.mock('react-native/Libraries/Utilities/useWindowDimensions',()=>({__esModule:true,default:jest.fn(()=>({width:320,height:640,scale:1,fontScale:1}))}));
const kinds=['Housekeeping','Room Service','Amenidades'];
function card(title:string,edit=jest.fn(),disabled=false,details=true) {
 return <ServiceRequestDisclosure key={title} id={title} title={title} summary="Fecha y horario de entrega" status="Solicitado" testID={title} total={title==='Room Service'?'Q 40.00':undefined}
   edit={{label:`Editar ${title}`,onPress:edit,disabled}}>{details?<Text>Contenido completo de {title}</Text>:null}</ServiceRequestDisclosure>;
}
function measure(ui:Awaited<ReturnType<typeof render>>,id:string,height:number,width=280) {
 return fireEvent(ui.getByTestId(`${id}-content`),'layout',{nativeEvent:{layout:{x:0,y:0,width,height}}});
}
beforeEach(()=>{jest.mocked(Native.useWindowDimensions).mockReturnValue({width:320,height:640,scale:1,fontScale:1});});
afterEach(()=>jest.restoreAllMocks());
it('uses compact uniform two-row summaries without counts and keeps the Room Service total on the right',async()=>{
 const ui=await render(<ServiceRequestDisclosureGroup>{kinds.map(kind=>card(kind))}</ServiceRequestDisclosureGroup>);
 for(const id of kinds){expect(ui.getByTestId(`${id}-body`)).toHaveStyle({height:96});expect(ui.queryByText(`Contenido completo de ${id}`)).toBeNull();expect(ui.getByTestId(`${id}-toggle`)).toHaveProp('accessibilityState',{expanded:false});}
 expect(ui.queryByText(/\d+ artículos?/)).toBeNull();expect(ui.getByText('Total · Q 40.00')).toBeTruthy();
 await fireEvent.press(ui.getByTestId('Room Service-toggle'));expect(ui.getByText('Contenido completo de Room Service')).toBeTruthy();expect(ui.getByTestId('Room Service-body')).toHaveStyle({height:96});expect(ui.getAllByText('Total · Q 40.00')).toHaveLength(1);
 await measure(ui,'Room Service',118);await fireEvent(ui.getByTestId('Room Service-details'),'layout',{nativeEvent:{layout:{x:0,y:0,width:240,height:400}}});expect(ui.getByTestId('Room Service-body')).toHaveStyle({height:518});expect(ui.getByTestId('Amenidades-body')).toHaveStyle({height:118});
});
it('keeps editing separate from disclosure and adds no button inside the expanded text',async()=>{
 const edit=jest.fn();const ui=await render(card('Room Service',edit));
 await fireEvent.press(ui.getByLabelText('Expandir detalles de Room Service'));expect(edit).not.toHaveBeenCalled();expect(ui.getAllByRole('button')).toHaveLength(2);
 expect(within(ui.getByTestId('Room Service-details')).queryAllByRole('button')).toHaveLength(0);
 await fireEvent.press(ui.getByTestId('Room Service-body'));expect(edit).toHaveBeenCalledTimes(1);await fireEvent.press(ui.getByLabelText('Contraer detalles de Room Service'));expect(edit).toHaveBeenCalledTimes(1);expect(ui.queryByText('Contenido completo de Room Service')).toBeNull();
});
it('permits just one measured overflowing card across services and requests',async()=>{
 const ids=[...kinds,'Otra solicitud'];const ui=await render(<ServiceRequestDisclosureGroup>{ids.map(id=>card(id))}</ServiceRequestDisclosureGroup>);
 for(const id of ids)await measure(ui,id,350);
 for(const id of ids){await fireEvent.press(ui.getByTestId(`${id}-toggle`));for(const other of ids)expect(ui.getByTestId(`${other}-toggle`)).toHaveProp('accessibilityState',{expanded:other===id});}
});
it('raises all collapsed summaries to the measured maximum on narrow screens and updates it on wider layouts',async()=>{
 const ui=await render(<ServiceRequestDisclosureGroup>{card('Housekeeping',jest.fn(),false,false)}{card('Amenidades',jest.fn(),false,false)}</ServiceRequestDisclosureGroup>);
 await measure(ui,'Housekeeping',300,180);for(const id of ['Housekeeping','Amenidades'])expect(ui.getByTestId(`${id}-body`)).toHaveStyle({height:300});
 await measure(ui,'Housekeeping',80,540);for(const id of ['Housekeeping','Amenidades'])expect(ui.getByTestId(`${id}-body`)).toHaveStyle({height:96});
 expect(ui.queryByTestId('Housekeeping-toggle')).toBeNull();
});
it('keeps the same reserved summary height at large font sizes without exposing item lines',async()=>{
 jest.mocked(Native.useWindowDimensions).mockReturnValue({width:320,height:640,scale:1,fontScale:2});const ui=await render(<ServiceRequestDisclosureGroup>{kinds.map(id=>card(id))}</ServiceRequestDisclosureGroup>);
 for(const id of kinds){expect(ui.getByTestId(`${id}-body`)).toHaveStyle({height:192});expect(ui.queryByText(`Contenido completo de ${id}`)).toBeNull();}
});
it('allows read-only and temporarily disabled cards to disclose without gaining editing permissions',async()=>{
 const edit=jest.fn();const ui=await render(<ServiceRequestDisclosureGroup>{card('Disabled',edit,true)}<ServiceRequestDisclosure id="done" title="Finalizado" summary="Resumen" status="Completado" testID="done"><Text>Historia completa</Text></ServiceRequestDisclosure></ServiceRequestDisclosureGroup>);
 for(const id of ['Disabled','done']){await measure(ui,id,250);await fireEvent.press(ui.getByTestId(`${id}-toggle`));expect(ui.getByTestId(`${id}-toggle`)).toHaveProp('accessibilityState',{expanded:true});await fireEvent.press(ui.getByTestId(`${id}-body`));}
 expect(edit).not.toHaveBeenCalled();expect(ui.queryByLabelText('Editar Finalizado')).toBeNull();
});

it('places title and current status together at the top, schedule left and total centered right below',async()=>{
 const ui=await render(card('Room Service'));const heading=ui.getByTestId('Room Service-heading');const schedule=ui.getByTestId('Room Service-schedule');
 expect(heading).toHaveStyle({flexDirection:'row',justifyContent:'space-between'});expect(within(heading).getByText('Room Service')).toHaveStyle({flex:1});
 expect(within(heading).getByText('Solicitado')).toHaveStyle({paddingVertical:8,borderRadius:12});
 expect(schedule).toHaveStyle({flexDirection:'row',alignItems:'center'});expect(within(schedule).getByText('Fecha y horario de entrega')).toHaveStyle({flex:1});
 expect(within(schedule).getByText('Total · Q 40.00')).toHaveStyle({textAlign:'right',alignSelf:'center'});
 await fireEvent(schedule,'layout',{nativeEvent:{layout:{x:0,y:44,width:240,height:72}}});expect(ui.getByTestId('Room Service-controls')).toHaveStyle({top:56,position:'absolute'});
});
