import React from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme } from '@/lib/theme';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import { ModalSheet } from '@/components/ModalSheet';

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

export default function DatePickerModal({
  visible,
  date,
  onCancel,
  onConfirm,
}: DatePickerModalProps) {
  const [pendingDate, setPendingDate] = React.useState<Date>(date);

  React.useEffect(() => {
    if (visible) setPendingDate(date);
  }, [visible, date]);

  return (
    <ModalSheet visible={visible} onClose={onCancel}>
      <View style={styles.modal}>
        <DatePicker date={pendingDate} onChange={setPendingDate} />
        <View style={styles.buttons}>
          <Button title="Cancel" onPress={onCancel} />
          <Button title="Confirm" onPress={() => onConfirm(pendingDate)} />
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  buttons: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: baseTheme.margin[2],
    marginTop: baseTheme.margin[3],
    width: '100%',
  },
  modal: { paddingVertical: baseTheme.margin[3] },
});
