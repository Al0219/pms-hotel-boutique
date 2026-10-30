import { createRequire } from 'node:module';
// jsdom is already the installed Vitest environment; use only this narrow test surface.
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string, options: { runScripts: string; beforeParse: (window: Window & typeof globalThis) => void }) => { window: Window & typeof globalThis } };
import { describe, expect, it, vi } from 'vitest';
import { demoCardDocument } from './demo-card-document';
function form(number: string, expiry: string, cvv: string, holder = 'Titular QA') {
  const dom = new JSDOM(demoCardDocument, { runScripts: 'dangerously', beforeParse(window) { Object.defineProperty(window, 'ResizeObserver', { value: class { observe() {} } }); } });
  const win = dom.window, emitted = vi.spyOn(win.parent, 'postMessage');
  win.dispatchEvent(new win.MessageEvent('message', { source: win as unknown as Window, data: { type: 'PMS_DEMO_INIT', channel: 'test', holderName: holder } }));
  for (const [id, value] of Object.entries({ number, expiry, code: cvv, holder })) (win.document.getElementById(id) as HTMLInputElement).value = value;
  win.document.querySelector('form')!.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  return { dom, win, messages: emitted.mock.calls.map(([value]) => value) as Array<{ type: string; card?: object }> };
}
describe('actual isolated synthetic form validation', () => {
  it.each([['4242424242424242', '123'], ['5555555555554444', '123'], ['378282246310005', '1234']])('accepts allowed synthetic %s and emits no number/CVV/expiry', (number, cvv) => {
    const view = form(number, '12/99', cvv);
    expect(view.messages.some(v => v.type === 'PMS_DEMO_TOKEN')).toBe(true);
    expect(JSON.stringify(view.messages)).not.toContain(number); expect(JSON.stringify(view.messages)).not.toMatch(/cvv|expiry|cardNumber/);
    expect((view.win.document.getElementById('number') as HTMLInputElement).value).toBe(''); view.dom.window.close();
  });
  it.each([['4242424242424241', '12/99', '123', 'Titular QA'], ['4242', '12/99', '123', 'Titular QA'], ['4000000000000002', '12/99', '123', 'Titular QA'], ['4242424242424242', '13/99', '123', 'Titular QA'], ['4242424242424242', '01/20', '123', 'Titular QA'], ['4242424242424242', '12/99', '999', 'Titular QA'], ['378282246310005', '12/99', '123', 'Titular QA'], ['4242424242424242', '12/99', '123', 'A']])('rejects invalid or non-allowlisted card, date, CVV or holder (%s)', (number, expiry, cvv, holder) => {
    const view = form(number, expiry, cvv, holder); expect(view.messages.some(v => v.type === 'PMS_DEMO_TOKEN')).toBe(false); expect(view.win.document.querySelector('[aria-invalid="true"]')).not.toBeNull(); view.dom.window.close();
  });
});
