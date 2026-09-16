import {
  formatVehiclePlate,
  hasDuplicateVehiclePlate,
  normalizePlateForComparison,
  sanitizeVehiclePlateBodyInput,
  validateRequiredVehicleText,
  validateVehiclePlateBody,
  vehicleInputLimits,
  vehiclePlatePrefixes,
} from '@/modules/valet';

describe('Vehicle registration frontend validation', () => {
  it('sets approved limits and trims required vehicle text', () => {
    expect(vehicleInputLimits).toEqual({ make: 40, model: 40, plateBody: 6, color: 30 });
    expect(validateRequiredVehicleText('   ', 'Marca')).toBe('Marca requerida.');
    expect(validateRequiredVehicleText(' Mercedes-Benz ', 'Marca')).toBeNull();
    expect(validateRequiredVehicleText('', 'Modelo')).toBe('Modelo requerido.');
  });

  it('uses the approved frontend prefix catalog and normalizes only the body at save/comparison time', () => {
    expect(vehiclePlatePrefixes).toEqual(['P', 'A', 'C', 'TE', 'U', 'TRC', 'M', 'MT', 'TC', 'O', 'CD', 'CC', 'MI', 'DIS']);
    expect(validateVehiclePlateBody('12ABC')).toBeNull();
    expect(validateVehiclePlateBody('123ABC')).toBeNull();
    expect(formatVehiclePlate('P', ' 123abc ')).toBe('P 123ABC');
    expect(normalizePlateForComparison('P', ' 123abc ')).toBe('P123ABC');
  });

  it('rejects malformed or empty plate bodies', () => {
    expect(validateVehiclePlateBody('')).toBe('Placa requerida.');
    for (const value of ['1ABC', '1234ABC', '123AB', '123ABCD', 'ABC123', '12A3BC', '12-ABC', '12 ABC', '123@ABC']) {
      expect(validateVehiclePlateBody(value)).toBe('La placa debe tener 2 o 3 números seguidos de 3 letras.');
    }
  });

  it('keeps the editable body in the allowed partial shape while rejecting invalid transitions', () => {
    expect(sanitizeVehiclePlateBodyInput('12ABCD')).toBe('12ABC');
    expect(sanitizeVehiclePlateBodyInput('123ABCD')).toBe('123ABC');
    expect(sanitizeVehiclePlateBodyInput('12A3')).toBe('12A');
    expect(sanitizeVehiclePlateBodyInput('123A4')).toBe('123A');
    expect(sanitizeVehiclePlateBodyInput('12-ABC')).toBe('12ABC');
  });

  it('detects duplicate session vehicles by prefix plus normalized body', () => {
    const vehicles = [{ platePrefix: 'P' as const, plateBody: '123ABC' }];
    expect(hasDuplicateVehiclePlate(vehicles, 'P', ' 123abc ')).toBe(true);
    expect(hasDuplicateVehiclePlate(vehicles, 'C', '123ABC')).toBe(false);
  });
});
