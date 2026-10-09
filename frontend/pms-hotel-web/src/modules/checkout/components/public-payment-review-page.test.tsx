it('retains the same key and card after a lost response across the error/payment navigation', async () => {
  const view = await prepared();

  fireEvent.click(
    screen.getByRole('button', { name: /50% de la estadía/ }),
  );

  fireEvent.change(
    screen.getByLabelText('Resultado de demostración'),
    { target: { value: 'demo_mastercard_approved' } },
  );

  const cartBefore = sessionStorage.getItem('pms:public-cart:v1:mock');
  expect(cartBefore).not.toBeNull();

  const removal = vi.spyOn(sessionStorage, 'removeItem');
  const originalFetch = globalThis.fetch;
  const keys: string[] = [];
  const bodies: string[] = [];
  let lost = false;

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const booking = String(input).includes('/__mock/checkout/confirmations');

    if (booking) {
      keys.push(new Headers(options?.headers).get('Idempotency-Key')!);
      bodies.push(String(options?.body));
    }

    const response = await originalFetch(input, options);

    if (booking && !lost) {
      lost = true;
      throw new TypeError('Connection lost after response');
    }

    return response;
  });

  // Primer intento: la respuesta se pierde después de procesar la reserva.
  confirm();

  await waitFor(
    () =>
      expect(push).toHaveBeenCalledWith(
        expect.stringContaining('/reserva/error?'),
      ),
    { timeout: 3000 },
  );

  view.rerender(
    <PublicBookingResultPage
      initialCriteria={criteria}
      status="error"
    />,
  );

  expect(
    screen.getByRole('link', {
      name: 'Reintentar verificación con la misma tarjeta',
    }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', {
      name: 'Modificar fechas o habitación',
    }),
  ).toBeDisabled();

  // La respuesta perdida no debe eliminar la selección.
  expect(
    sessionStorage.getItem('pms:public-cart:v1:mock'),
  ).toBe(cartBefore);

  expect(
    removal.mock.calls.filter(
      ([key]) => key === 'pms:public-cart:v1:mock',
    ),
  ).toHaveLength(0);

  // Regresar al pago conservando el intento original.
  push.mockClear();

  view.rerender(
    <PublicPaymentReviewPage initialCriteria={criteria} />,
  );

  await screen.findByRole('button', {
    name: 'Garantizar y confirmar reserva',
  });

  expect(
    screen.getByLabelText('Resultado de demostración'),
  ).toHaveValue('demo_mastercard_approved');

  expect(
    screen.getByLabelText('Resultado de demostración'),
  ).toBeDisabled();

  expect(
    screen.getByRole('button', { name: /50% de la estadía/ }),
  ).toHaveAttribute('aria-pressed', 'true');

  expect(
    screen.getByRole('button', { name: 'Personalizado' }),
  ).toBeDisabled();

  expect(
    screen.getByRole('complementary'),
  ).toHaveTextContent('US$ 252.50');

  // Segundo intento: debe reutilizar la misma clave y el mismo payload.
  confirm();

  await waitFor(
    () =>
      expect(push).toHaveBeenCalledWith(
        expect.stringContaining('/reserva/confirmacion?'),
      ),
    { timeout: 3000 },
  );

  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(bodies[1]).toBe(bodies[0]);

  // Esperar a que React complete el efecto de limpieza del carrito.
  await waitFor(() => {
    expect(
      sessionStorage.getItem('pms:public-cart:v1:mock'),
    ).toBeNull();

    expect(
      removal.mock.calls.filter(
        ([key]) => key === 'pms:public-cart:v1:mock',
      ),
    ).toHaveLength(1);
  });

  // La confirmación debe mantenerse disponible después del retry.
  view.rerender(
    <PublicBookingConfirmationPage initialCriteria={criteria} />,
  );

  expect(
    screen.getByRole('heading', { name: 'HB-2026-8942' }),
  ).toBeInTheDocument();
}, 10000);
