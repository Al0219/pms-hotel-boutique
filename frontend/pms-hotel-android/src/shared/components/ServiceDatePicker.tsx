import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { parseServiceDate, formatServiceDate } from '@/modules/service-requests';

export function ServiceDatePicker({ maximumDate, minimumDate, onCancel, onConfirm, testID, value, visible }: {
  maximumDate?: Date;
  minimumDate: Date;
  onCancel: () => void;
  onConfirm: (serviceDate: string) => void;
  testID: string;
  value: string;
  visible: boolean;
}) {
  if (!visible) return null;
  const selectedDate = parseServiceDate(value) ?? minimumDate;
  const onChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === 'dismissed' || !nextDate) { onCancel(); return; }
    onConfirm(formatServiceDate(nextDate));
  };
  return <DateTimePicker display="default" maximumDate={maximumDate} minimumDate={minimumDate} mode="date" onChange={onChange} testID={testID} value={selectedDate} />;
}
