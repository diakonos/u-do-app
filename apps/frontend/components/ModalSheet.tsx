import { useTheme } from '@/lib/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
  shadowColor?: string;
  testID?: string;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  children,
  backgroundColor,
  shadowColor,
  testID,
}) => {
  const [showing, setShowing] = useState(visible);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const safeArea = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      setShowing(true);
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (showing) {
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowing(false));
    }
  }, [overlayAnim, sheetAnim, showing, visible]);

  if (!showing) return null;
  return (
    <Portal>
      <Pressable style={styles.modalTouch} onPress={onClose} testID={testID}>
        <Animated.View
          style={[styles.modalOverlay, { backgroundColor: theme.overlay, opacity: overlayAnim }]}
        />
      </Pressable>
      <Animated.View style={styles.modalContent}>
        <Animated.View
          style={[
            styles.modalSheet,
            {
              backgroundColor: backgroundColor || theme.background,
              paddingBottom: safeArea.bottom,
              shadowColor: shadowColor || '#000000',
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    alignItems: 'stretch',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1001,
  },
  modalOverlay: {
    alignItems: 'stretch',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  modalSheet: {
    alignItems: 'center',
    alignSelf: 'flex-end', // Anchor to bottom
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    flexShrink: 1, // Allow shrinking to content
    maxHeight: '80%', // Prevent going off top
    overflow: 'visible',
    padding: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: '100%', // Fill width
  },
  modalTouch: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
