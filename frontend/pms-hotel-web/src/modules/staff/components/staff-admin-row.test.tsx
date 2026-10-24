import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StaffAdminRow } from './staff-admin-row';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(enabled = true) {
  const reveal = vi.fn(), click = vi.fn(), action = vi.fn();
  const content = (ready: boolean, opened = false) => <table><thead><tr><th>Usuario</th><th>Acceso</th><th>Asignación</th></tr></thead><tbody>
    <StaffAdminRow enabled={ready} revealed={opened} onReveal={reveal} onClick={click}>
      <td><strong>mlopez</strong><input aria-label="Correo" /><button data-staff-edit-trigger="email" onClick={action}><small>correo@qa.test</small></button><button onClick={action}>Editar</button></td>
      <td><span>Activo</span><div data-staff-row-action><button onClick={action}>Opciones</button></div></td>
      <td><div data-testid="blank" /></td>
    </StaffAdminRow>
  </tbody></table>;
  const view = render(content(enabled)), blank = screen.getByTestId('blank'), row = blank.closest('tr')!;
  return { row, blank, reveal, click, action, refresh: (ready: boolean, opened = false) => view.rerender(content(ready, opened)) };
}
function pointer(target: Element, type: string, x: number, y = 30, extra = {}) {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
    buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, ...extra,
  });
  fireEvent(target, event);
  return event;
}
function wheel(target: Element, deltaX: number, deltaY = 0, extra = {}) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX, deltaY, ...extra });
  fireEvent(target, event);
  return event;
}

it.each(['mouse', 'touch'])('row gesture: %s drag reveals, closes and never clicks an action', type => {
  const { blank, row, reveal, click, action } = mount();
  pointer(blank, 'pointerdown', 220, 30, { pointerType: type });
  pointer(row, 'pointermove', 140, 33, { pointerType: type });
  pointer(row, 'pointerup', 140, 33, { pointerType: type });
  expect(reveal).toHaveBeenLastCalledWith(true);
  fireEvent.click(row, { detail: 1 }); expect(click).not.toHaveBeenCalled();
  fireEvent.click(row); expect(click).toHaveBeenCalledTimes(1);
  pointer(blank, 'pointerdown', 100, 30, { pointerType: type });
  pointer(row, 'pointermove', 180, 33, { pointerType: type });
  pointer(row, 'pointerup', 180, 33, { pointerType: type });
  expect(reveal).toHaveBeenLastCalledWith(false); expect(action).not.toHaveBeenCalled();
  expect(screen.getAllByRole('columnheader')).toHaveLength(3);
});
it('row gesture: ordinary click and short mouse movement retain expansion behavior', () => {
  const { blank, row, reveal, click } = mount();
  pointer(blank, 'pointerdown', 220); pointer(row, 'pointermove', 208); pointer(row, 'pointerup', 208);
  fireEvent.click(row); expect(click).toHaveBeenCalledTimes(1); expect(reveal).not.toHaveBeenCalled();
});
it.each(['cancel', 'capture-lost', 'blur', 'hidden', 'escape', 'released-button', 'back-to-start'])('row gesture: %s cancels mouse drag without revealing', reason => {
  const { blank, row, reveal } = mount();
  pointer(blank, 'pointerdown', 220); pointer(row, 'pointermove', 140);
  if (reason === 'cancel') pointer(row, 'pointercancel', 140);
  if (reason === 'capture-lost') pointer(row, 'lostpointercapture', 140);
  if (reason === 'blur') fireEvent(window, new Event('blur'));
  if (reason === 'escape') fireEvent.keyDown(window, { key: 'Escape' });
  if (reason === 'hidden') { vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); fireEvent(document, new Event('visibilitychange')); }
  if (reason === 'released-button') pointer(row, 'pointermove', 130, 30, { buttons: 0 });
  pointer(row, 'pointerup', reason === 'back-to-start' ? 218 : 140);
  expect(reveal).not.toHaveBeenCalled();
});
it.each(['right-button', 'modified', 'vertical', 'secondary', 'disabled', 'selection', 'input', 'button', 'context-control'])('row gesture: mouse %s preserves native behavior', kind => {
  const { blank, row, reveal } = mount(kind !== 'disabled');
  const target = kind === 'selection' ? screen.getByText('mlopez') : kind === 'input' ? screen.getByLabelText('Correo')
    : kind === 'button' ? screen.getByRole('button', { name: 'Editar' })
    : kind === 'context-control' ? screen.getByRole('button', { name: 'Opciones' }) : blank;
  if (kind === 'selection') window.getSelection()!.selectAllChildren(screen.getByText('mlopez'));
  const extra = kind === 'right-button' ? { button: 2 } : kind === 'modified' ? { shiftKey: true } : kind === 'secondary' ? { isPrimary: false } : {};
  const start = pointer(target, 'pointerdown', 220, 30, extra);
  pointer(row, 'pointermove', kind === 'vertical' ? 215 : 140, kind === 'vertical' ? 130 : 32);
  pointer(row, 'pointerup', 140, kind === 'vertical' ? 130 : 32);
  expect(reveal).not.toHaveBeenCalled();
  if (kind !== 'vertical') expect(start.defaultPrevented).toBe(false);
  if (kind === 'selection') window.getSelection()!.removeAllRanges();
});
it('row gesture: never captures normal clicks and tracks actual drag beyond the row', () => {
  const { blank, row, reveal, click } = mount(); const capture = vi.fn();
  Object.defineProperty(blank, 'setPointerCapture', { value: capture });
  pointer(blank, 'pointerdown', 220); pointer(blank, 'pointerup', 220); fireEvent.click(blank,{detail:1});
  expect(capture).not.toHaveBeenCalled();expect(click).toHaveBeenCalledTimes(1);expect(reveal).not.toHaveBeenCalled();
  pointer(blank,'pointerdown',220);pointer(document.body,'pointermove',140);pointer(document.body,'pointerup',140);
  expect(reveal).toHaveBeenCalledExactlyOnceWith(true);expect(capture).not.toHaveBeenCalled();
});
it('row gesture: losing authorization while dragging cancels and controls remain usable after a drag', () => {
  const { blank, row, reveal, refresh, action } = mount();
  pointer(blank, 'pointerdown', 220); pointer(row, 'pointermove', 140); refresh(false); pointer(row, 'pointerup', 140); expect(reveal).not.toHaveBeenCalled();
  refresh(true); pointer(blank, 'pointerdown', 220); pointer(row, 'pointermove', 140); pointer(row, 'pointerup', 140);
  fireEvent.click(screen.getByRole('button', { name: 'Opciones' })); expect(action).toHaveBeenCalledTimes(1);
});
it('row gesture: touchpad wheel accumulates horizontal deltas, handles momentum once and reverses to close', () => {
  const { blank, reveal, action, click, row } = mount();
  expect(wheel(blank, 20).defaultPrevented).toBe(true); expect(reveal).not.toHaveBeenCalled();
  wheel(blank, 18); wheel(blank, 12); expect(reveal).toHaveBeenCalledExactlyOnceWith(true);
  wheel(blank, 100); expect(reveal).toHaveBeenCalledTimes(1);
  wheel(blank, -25); wheel(blank, -25); expect(reveal).toHaveBeenLastCalledWith(false);
  expect(action).not.toHaveBeenCalled(); fireEvent.click(row); expect(click).toHaveBeenCalledTimes(1);
});
it.each(['vertical', 'diagonal', 'zoom', 'selected-text', 'control', 'disabled'])('row gesture: touchpad %s is not intercepted', kind => {
  const { blank, reveal } = mount(kind !== 'disabled');
  if (kind === 'selected-text') vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'selected' } as Selection);
  const target = kind === 'control' ? screen.getByLabelText('Correo') : blank;
  const event = wheel(target, kind === 'vertical' ? 0 : kind === 'diagonal' ? 40 : 70, kind === 'vertical' ? 80 : kind === 'diagonal' ? 60 : 0, kind === 'zoom' ? { ctrlKey: true } : {});
  expect(event.defaultPrevented).toBe(false); expect(reveal).not.toHaveBeenCalled();
});
it('row gesture: wheel bursts reset on idle, vertical scrolling and blur; line deltas normalize', () => {
  const { blank, reveal } = mount(); const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  wheel(blank, 25); clock.mockReturnValue(1300); wheel(blank, 25); expect(reveal).not.toHaveBeenCalled();
  wheel(blank, 0, 40); wheel(blank, 25); expect(reveal).not.toHaveBeenCalled();
  fireEvent(window, new Event('blur')); wheel(blank, 3, 0, { deltaMode: 1 }); expect(reveal).toHaveBeenCalledExactlyOnceWith(true);
});

it.each(['username','email'])('row gesture: starts on normal %s content without triggering inline edit or expansion', origin => {
  const { row, reveal, click, action } = mount();
  const target = origin === 'username' ? screen.getByText('mlopez') : screen.getByText('correo@qa.test');
  pointer(target,'pointerdown',220);pointer(row,'pointermove',140);expect(row).toHaveAttribute('data-staff-dragging','true');pointer(row,'pointerup',140);
  fireEvent.click(target,{detail:1});expect(reveal).toHaveBeenCalledExactlyOnceWith(true);expect(click).not.toHaveBeenCalled();expect(action).not.toHaveBeenCalled();expect(row).not.toHaveAttribute('data-staff-dragging');
  fireEvent.click(screen.getByText('correo@qa.test'),{detail:1});expect(action).toHaveBeenCalledTimes(1);
});
it('row gesture: a click-to-edit click without dragging still reaches the original control', () => {
  const { action }=mount();const target=screen.getByText('correo@qa.test');pointer(target,'pointerdown',220);pointer(target,'pointerup',220);fireEvent.click(target,{detail:1});expect(action).toHaveBeenCalledTimes(1);
});
it('row gesture: only selection created by the recognized row drag is cleared; deliberate selection is preserved', () => {
  const {row,reveal}=mount();const name=screen.getByText('mlopez'), selection=window.getSelection()!;
  selection.removeAllRanges();pointer(name,'pointerdown',220);const range=document.createRange();range.selectNodeContents(name);selection.addRange(range);pointer(row,'pointermove',140);expect(selection.toString()).toBe('');pointer(row,'pointerup',140);expect(reveal).toHaveBeenCalledWith(true);
  selection.addRange(range);pointer(name,'pointerdown',220);pointer(row,'pointermove',140);pointer(row,'pointerup',140);expect(selection.toString()).toBe('mlopez');expect(reveal).toHaveBeenCalledTimes(1);selection.removeAllRanges();
  pointer(name,'pointerdown',220,30,{shiftKey:true});selection.addRange(range);pointer(row,'pointermove',140);pointer(row,'pointerup',140);expect(selection.toString()).toBe('mlopez');expect(reveal).toHaveBeenCalledTimes(1);selection.removeAllRanges();
});
it('row gesture: keyboard activation remains available after a drag', () => {
  const {row,blank,action}=mount();pointer(blank,'pointerdown',220);pointer(row,'pointermove',140);pointer(row,'pointerup',140);fireEvent.click(screen.getByText('correo@qa.test'),{detail:0});expect(action).toHaveBeenCalledTimes(1);
});

it.each(['completed','cancelled'])('row gesture: a new ordinary click immediately after %s drag is never consumed', mode => {
 const {blank,row,action}=mount();pointer(blank,'pointerdown',220);pointer(row,'pointermove',140);
 if(mode==='cancelled')pointer(row,'pointercancel',140);else pointer(row,'pointerup',140);
 const trigger=screen.getByText('correo@qa.test');pointer(trigger,'pointerdown',140);pointer(trigger,'pointerup',140);fireEvent.click(trigger,{detail:1});expect(action).toHaveBeenCalledTimes(1);
});
it('row gesture: simple down/up is never prevented or stopped, even after selection', () => {
 const {action}=mount();const trigger=screen.getByText('correo@qa.test');vi.spyOn(window,'getSelection').mockReturnValue({toString:()=> 'previous selection'} as Selection);
 const down=pointer(trigger,'pointerdown',140),up=pointer(trigger,'pointerup',140);fireEvent.click(trigger,{detail:1});expect(down.defaultPrevented).toBe(false);expect(up.defaultPrevented).toBe(false);expect(action).toHaveBeenCalledTimes(1);
});

it('row gesture: unrelated text selection does not disable row drag and is never cleared', () => {
 const {row,reveal}=mount();const elsewhere=document.createElement('p');elsewhere.textContent='outside selection';document.body.append(elsewhere);const selection=window.getSelection()!;
 try{selection.selectAllChildren(elsewhere);const target=screen.getByText('correo@qa.test');pointer(target,'pointerdown',220);pointer(row,'pointermove',140);pointer(row,'pointerup',140);expect(reveal).toHaveBeenCalledExactlyOnceWith(true);expect(selection.toString()).toBe('outside selection');}finally{selection.removeAllRanges();elsewhere.remove();}
});

it.each(['mouse', 'touch'])('row presentation: %s follows the pointer and snaps only beyond the threshold', pointerType => {
  const {row, blank, reveal, refresh, action} = mount();
  pointer(blank, 'pointerdown', 220, 30, {pointerType});
  pointer(row, 'pointermove', 190, 30, {pointerType});
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-30px');
  expect(reveal).not.toHaveBeenCalled();
  pointer(row, 'pointerup', 190, 30, {pointerType});
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('0px');
  pointer(blank, 'pointerdown', 220, 30, {pointerType});
  pointer(row, 'pointermove', 140, 30, {pointerType});
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-80px');
  pointer(row, 'pointerup', 140, 30, {pointerType});
  expect(reveal).toHaveBeenLastCalledWith(true);
  refresh(true, true);
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-240px');
  expect(row.querySelectorAll(':scope > td')).toHaveLength(3);
  expect(row.querySelector('[inert]')).not.toBeInTheDocument();
  pointer(blank, 'pointerdown', 100, 30, {pointerType});
  pointer(row, 'pointermove', 130, 30, {pointerType});
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-210px');
  pointer(row, 'pointercancel', 130, 30, {pointerType});
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-240px');
  pointer(blank, 'pointerdown', 100, 30, {pointerType});
  pointer(row, 'pointermove', 180, 30, {pointerType}); pointer(row, 'pointerup', 180, 30, {pointerType});
  expect(reveal).toHaveBeenLastCalledWith(false);
  expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('0px');
  expect(action).not.toHaveBeenCalled();
});

it('row presentation: touchpad previews the same shared foreground offset and losing permission closes it', () => {
  const {row, blank, reveal, refresh} = mount();
  wheel(blank, 25); expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-25px');
  wheel(blank, 30); expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('-240px');
  expect(reveal).toHaveBeenLastCalledWith(true); refresh(true, true);
  wheel(blank, -60); expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('0px');
  refresh(false); expect(row.style.getPropertyValue('--staff-swipe-x')).toBe('0px');
  expect(row.querySelector('[inert]')).toBeInTheDocument();
});
