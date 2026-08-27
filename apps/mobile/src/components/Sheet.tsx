import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export interface SheetProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

export function Sheet({ visible, onRequestClose, children }: SheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoidingWrap}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: tokens.colors.surface,
                borderTopColor: tokens.colors.border,
                maxHeight: height * 0.85,
                paddingBottom: Math.max(insets.bottom + 12, tokens.spacing.xl),
              },
            ]}
          >
            <View style={styles.grabberWrap}>
              <View
                style={[
                  styles.grabber,
                  { backgroundColor: tokens.colors.border },
                ]}
              />
            </View>
            <View
              accessibilityViewIsModal
              style={[
                styles.content,
                { paddingHorizontal: tokens.spacing.xl - 4 },
              ]}
            >
              {children}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avoidingWrap: {
    width: "100%",
  },
  sheetContainer: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  grabberWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 12,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    width: "100%",
  },
});
