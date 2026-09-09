import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';

describe('requireDtoField', () => {
  it('returns a present value without normalization', () => {
    expect(requireDtoField('value', 'sample')).toBe('value');
  });

  it('throws a typed error for a missing required value', () => {
    expect(() => requireDtoField(null, 'sample')).toThrow(DomainMappingError);
  });
});
