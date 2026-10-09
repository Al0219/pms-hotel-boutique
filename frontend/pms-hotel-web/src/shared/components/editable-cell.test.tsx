import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { EditableCell } from './editable-cell';
it('cancels via Escape, restores focus and never calls save', async () => {
  const save = vi.fn(), user = userEvent.setup();
  render(<EditableCell value="101" label="código 101" maxLength={64} onSave={save} getError={() => 'Error'} />);
  const trigger = screen.getByRole('button', { name: 'Editar código 101' }); await user.click(trigger);
  await user.type(screen.getByLabelText('código 101'), '2'); await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus()); expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); expect(save).not.toHaveBeenCalled();
});
it('blocks repeated submits and cancelling during an in-flight save, then retains draft and previous value on failure', async () => {
  let reject!: (error: Error) => void;
  const save = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
  render(<EditableCell value="101" label="código 101" maxLength={64} onSave={save} getError={() => 'No confirmado'} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar código 101' })); fireEvent.change(screen.getByLabelText('código 101'), { target: { value: '102' } });
  const form = screen.getByLabelText('código 101').closest('form')!; fireEvent.submit(form); fireEvent.submit(form);
  expect(save).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => reject(new Error('failed')));
  expect(screen.getByLabelText('código 101')).toHaveValue('102'); expect(screen.getByText('Valor actual: 101')).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent('No confirmado');
});
