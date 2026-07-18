import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Lightweight bottom sheet: a Modal that slides in from the bottom. Used for
// pickers and short option lists. Drag-to-dismiss is left to the next phase;
// Phase 5 ships the static shape so screens can be built against it.

export interface SheetProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

export function Sheet({ visible, onRequestClose, children }: SheetProps) {
  const { tokens } = useTheme();
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onRequestClose}
      onShow={() => setMounted(true)}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.4)" }]}
        onPress={onRequestClose}
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.surface,
              borderTopLeftRadius: tokens.radius.lg,
              borderTopRightRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          {mounted ? children : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopWidth: 1,
    minHeight: 120,
  },
});
