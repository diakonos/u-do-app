import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker from 'react-native-ui-datepicker';
import { useTheme } from '@/lib/theme';

interface CalendarDatePickerProps {
  date: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({ date, onChange, minDate }) => {
  const theme = useTheme();
  if (Platform.OS === 'web') {
    return (
      <DatePicker
        date={date}
        onChange={e => {
          if (e.date) onChange(new Date(e.date.toString()));
        }}
        mode="single"
        minDate={minDate}
        style={{ backgroundColor: theme.background }}
        styles={{
          day_label: { color: theme.text },
          month_label: { color: theme.text },
          month_selector_label: { color: theme.text },
          selected_label: { color: theme.white },
          selected: { backgroundColor: theme.brand },
          today_label: { color: theme.text },
          today: { backgroundColor: theme.inputBackground },
          weekday_label: { color: theme.text },
          year_label: { color: theme.text },
          year_selector_label: { color: theme.text },
        }}
      />
    );
  }
  return (
    <DateTimePicker
      value={date}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      minimumDate={minDate}
      onChange={(e, d) => d && onChange(d)}
    />
  );
};

export default CalendarDatePicker;
