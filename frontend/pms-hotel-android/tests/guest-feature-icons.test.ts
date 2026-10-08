import { guestFeatureIcons } from '@/modules/navigation';

describe('guest feature icon registry', () => {
  it('provides platform metadata for the shared guest concepts', () => {
    expect(guestFeatureIcons.housekeeping).toEqual({ android: 'cleaning_services', ios: 'sparkles', web: 'cleaning_services' });
    expect(guestFeatureIcons.transfer).toEqual({ android: 'airport_shuttle', ios: 'car.side.fill', web: 'airport_shuttle' });
    expect(guestFeatureIcons.checkout).toEqual({ android: 'fact_check', ios: 'checkmark.circle.fill', web: 'fact_check' });
  });
});
