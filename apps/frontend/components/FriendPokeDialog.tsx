import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type FriendPokeDialogProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: string) => void;
  friendName?: string;
};

const options = [
  "You're killing it",
  'Lazy bum',
  'where r u',
];

export default function FriendPokeDialog({ visible, onClose, onSelect, friendName }: FriendPokeDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Poke {friendName || 'your friend'}:</Text>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.option}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 260,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    width: '100%',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
  },
  cancel: {
    marginTop: 12,
    padding: 8,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
});
