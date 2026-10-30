import {render,fireEvent,waitFor} from '@testing-library/react-native';
import {SyntheticPaymentForm} from '@/modules/checkout/presentation/SyntheticPaymentForm';
it('shows field errors, masks inputs and approves only after Confirmar with no scenario selector',async()=>{
 const submit=jest.fn(),ui=await render(<SyntheticPaymentForm balance="100.00" today="2030-01-02" busy={false} onSubmit={submit}/>);
 expect(ui.queryByText('Resultado de simulación')).toBeNull();expect(ui.queryByText('No existe débito bancario.')).toBeNull();await fireEvent.press(ui.getByText('Confirmar'));expect(submit).not.toHaveBeenCalled();expect(ui.getByText(/Visa de demostración/)).toBeTruthy();
 for(const [label,value] of [['Número de tarjeta ficticia','4242424242424242'],['Vencimiento MM/AA','1235'],['CVV ficticio','1a2b3'],['Titular de prueba','  María  Muñoz '],['Importe GTQ','100.01']])await fireEvent.changeText(ui.getByLabelText(label),value);
 expect(ui.getByLabelText('Número de tarjeta ficticia').props.value).toBe('4242 4242 4242 4242');expect(ui.getByLabelText('Vencimiento MM/AA').props.value).toBe('12/35');expect(ui.getByLabelText('CVV ficticio').props.value).toBe('123');expect(submit).not.toHaveBeenCalled();
 await fireEvent.press(ui.getByText('Confirmar'));expect(ui.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 100.00.')).toBeTruthy();expect(submit).not.toHaveBeenCalled();await fireEvent.changeText(ui.getByLabelText('Importe GTQ'),'30.50');await fireEvent.press(ui.getByText('Confirmar'));await waitFor(()=>expect(submit).toHaveBeenCalledTimes(1));expect(submit).toHaveBeenCalledWith({amount:'30.50',currency:'GTQ',instrumentToken:'demo_visa_approved'});expect(ui.getByLabelText('Número de tarjeta ficticia').props.value).toBe('');
});
it('filters the holder immediately and updates the amount message when Backend balance changes',async()=>{
 const submit=jest.fn(),ui=await render(<SyntheticPaymentForm balance="770.00" today="2030-01-02" busy={false} onSubmit={submit}/>);
 await fireEvent.changeText(ui.getByLabelText('Titular de prueba'),'Dr. José2@ Ñ.');expect(ui.getByLabelText('Titular de prueba').props.value).toBe('Dr. José Ñ.');
 await fireEvent.changeText(ui.getByLabelText('Importe GTQ'),'800');await fireEvent.press(ui.getByText('Confirmar'));expect(ui.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.')).toBeTruthy();
 await ui.rerender(<SyntheticPaymentForm balance="25.50" today="2030-01-02" busy={false} onSubmit={submit}/>);expect(ui.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 25.50.')).toBeTruthy();expect(ui.queryByText('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.')).toBeNull();expect(submit).not.toHaveBeenCalled();
});
it('handles smart typing, paste and Backspace without trapping the separator',async()=>{
 const ui=await render(<SyntheticPaymentForm balance="100.00" today="2030-01-02" busy={false} onSubmit={jest.fn()}/>),input=()=>ui.getByLabelText('Vencimiento MM/AA');
 await fireEvent.changeText(input(),'2');expect(input().props.value).toBe('02/');await fireEvent.changeText(input(),'02/26');expect(input().props.value).toBe('02/26');await fireEvent.changeText(input(),'12');expect(input().props.value).toBe('12/');
 await fireEvent.changeText(input(),'12');expect(input().props.value).toBe('12/');await fireEvent(input(),'keyPress',{nativeEvent:{key:'Backspace'}});await fireEvent.changeText(input(),'12');expect(input().props.value).toBe('1');await fireEvent.changeText(input(),'139');expect(input().props.value).toBe('01/39');
});
