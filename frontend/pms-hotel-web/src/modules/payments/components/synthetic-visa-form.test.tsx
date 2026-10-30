import {fireEvent,render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SyntheticVisaForm} from './synthetic-visa-form';
afterEach(cleanup);
it('has one Confirmar button and no payment side effect until valid submission',()=>{
 const submit=vi.fn();render(<SyntheticVisaForm balance="100.00" today="2030-01-02" busy={false} onSubmit={submit}/>);expect(screen.getAllByRole('button')).toHaveLength(1);expect(screen.queryByText('Resultado de simulación')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(submit).not.toHaveBeenCalled();expect(screen.getByLabelText('Número de tarjeta ficticia')).toHaveAttribute('aria-invalid','true');
 for(const [label,value] of [['Número de tarjeta ficticia','4242424242424242'],['Vencimiento MM/AA','1235'],['CVV ficticio','1a2b3'],['Titular de prueba','  María  Muñoz '],['Importe GTQ','100.01']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 expect(screen.getByLabelText('Número de tarjeta ficticia')).toHaveValue('4242 4242 4242 4242');expect(screen.getByLabelText('Vencimiento MM/AA')).toHaveValue('12/35');expect(screen.getByLabelText('CVV ficticio')).toHaveValue('123');expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 100.00.')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Importe GTQ'),{target:{value:'30.50'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(submit).toHaveBeenCalledExactlyOnceWith({amount:'30.50',currency:'GTQ',instrumentToken:'demo_visa_approved'});expect(screen.getByLabelText('Número de tarjeta ficticia')).toHaveValue('');
});
it('filters pasted holder text immediately and refreshes the amount error with the current Backend balance',()=>{
 const submit=vi.fn(),view=render(<SyntheticVisaForm balance="770.00" today="2030-01-02" busy={false} onSubmit={submit}/>);
 fireEvent.change(screen.getByLabelText('Titular de prueba'),{target:{value:'Dr. José2@ Ñ.'}});expect(screen.getByLabelText('Titular de prueba')).toHaveValue('Dr. José Ñ.');
 fireEvent.change(screen.getByLabelText('Importe GTQ'),{target:{value:'800'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.')).toBeInTheDocument();
 view.rerender(<SyntheticVisaForm balance="25.50" today="2030-01-02" busy={false} onSubmit={submit}/>);expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 25.50.')).toBeInTheDocument();expect(screen.queryByText('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.')).not.toBeInTheDocument();expect(submit).not.toHaveBeenCalled();
});
it('handles smart typing, paste and Backspace without trapping the separator',()=>{
 render(<SyntheticVisaForm balance="100.00" today="2030-01-02" busy={false} onSubmit={vi.fn()}/>);const input=screen.getByLabelText('Vencimiento MM/AA');fireEvent.input(input,{target:{value:'2'},inputType:'insertText'});expect(input).toHaveValue('02/');fireEvent.input(input,{target:{value:'12'},inputType:'insertFromPaste'});expect(input).toHaveValue('12/');fireEvent.input(input,{target:{value:'12'},inputType:'insertFromPaste'});expect(input).toHaveValue('12/');fireEvent.input(input,{target:{value:'12'},inputType:'deleteContentBackward'});expect(input).toHaveValue('1');fireEvent.input(input,{target:{value:'139'},inputType:'insertFromPaste'});expect(input).toHaveValue('01/39');
});
