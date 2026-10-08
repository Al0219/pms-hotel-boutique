import { fireEvent, render } from '@testing-library/react-native';

import { UniversalState } from '@/shared/components';

describe('UniversalState', () => {
  it('renders an accessible loading state with title and body', async () => {
    const ui = await render(<UniversalState body="Recuperando información." kind="loading" testID="state-loading" title="Cargando" />);

    expect(ui.getByText('Cargando').props.accessibilityRole).toBe('header');
    expect(ui.getByText('Recuperando información.')).toBeTruthy();
    expect(ui.getAllByLabelText('Cargando. Recuperando información.')).toHaveLength(2);
    expect(ui.getByTestId('state-loading-indicator').props.accessibilityState).toEqual({ busy: true });
    expect(ui.queryByTestId('state-loading-action')).toBeNull();
  });

  it('renders Error retry exactly once when provided', async () => {
    const retry = jest.fn();
    const ui = await render(<UniversalState body="Intenta nuevamente." kind="error" retry={{ accessibilityLabel: 'Reintentar carga', label: 'Reintentar', onPress: retry }} testID="state-error" title="No pudimos cargar" />);

    const button = ui.getByLabelText('Reintentar carga');
    expect(button.props.accessibilityRole).toBe('button');
    await fireEvent.press(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(ui.getByTestId('state-error-action')).toBeTruthy();
  });

  it('does not render an invalid Error action when retry is omitted', async () => {
    const ui = await render(<UniversalState kind="error" testID="state-error" title="No pudimos cargar" />);

    expect(ui.queryByTestId('state-error-action')).toBeNull();
  });

  it('keeps Offline explicit and delegates retry once', async () => {
    const retry = jest.fn();
    const ui = await render(<UniversalState body="Conéctate y reintenta." kind="offline" retry={{ label: 'Reintentar', onPress: retry }} testID="state-offline" title="Sin conexión" />);

    expect(ui.getByText('Sin conexión').props.accessibilityRole).toBe('header');
    expect(ui.getByLabelText('Sin conexión. Conéctate y reintenta.')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('state-offline-action'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders Empty without assuming an action', async () => {
    const ui = await render(<UniversalState body="Aún no hay elementos." kind="empty" testID="state-empty" title="Sin resultados" />);

    expect(ui.getByText('Sin resultados').props.accessibilityRole).toBe('header');
    expect(ui.queryByTestId('state-empty-action')).toBeNull();
  });

  it('delegates an optional Empty action and exposes its accessible state', async () => {
    const action = jest.fn();
    const ui = await render(<UniversalState action={{ accessibilityLabel: 'Crear primer elemento', label: 'Crear', onPress: action }} kind="empty" testID="state-empty" title="Sin resultados" />);

    const button = ui.getByLabelText('Crear primer elemento');
    expect(button.props.accessibilityState).toEqual({ disabled: false });
    await fireEvent.press(button);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
