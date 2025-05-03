import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker from 'react-native-ui-datepicker';
import { Colors } from '@/constants/Colors';

interface CalendarDatePickerProps {
  date: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  colorScheme: 'light' | 'dark';
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  date,
  onChange,
  minDate,
  colorScheme,
}) => {
  if (Platform.OS === 'web') {
    return (
      <DatePicker
        date={date}
        onChange={e => {
          if (e.date) onChange(new Date(e.date.toString()));
        }}
        mode="single"
        minDate={minDate}
        style={{ backgroundColor: Colors[colorScheme].background }}
        styles={{
          day_label: { color: Colors[colorScheme].text },
          month_label: { color: Colors[colorScheme].text },
          month_selector_label: { color: Colors[colorScheme].text },
          selected_label: { color: Colors[colorScheme].white },
          selected: { backgroundColor: Colors[colorScheme].brand },
          today_label: { color: Colors[colorScheme].text },
          today: { backgroundColor: Colors[colorScheme].inputBackground },
          weekday_label: { color: Colors[colorScheme].text },
          year_label: { color: Colors[colorScheme].text },
          year_selector_label: { color: Colors[colorScheme].text },
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
