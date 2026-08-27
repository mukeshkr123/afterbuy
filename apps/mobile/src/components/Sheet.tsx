import { BottomSheet, Host, RNHostView } from "@expo/ui";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
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

  return (
    <Host
      matchContents
      colorScheme={tokens.name}
      seedColor={tokens.colors.primary}
    >
      <BottomSheet
        isPresented={visible}
        onDismiss={onRequestClose}
        snapPoints={["half", "full"]}
      >
        <RNHostView matchContents>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{
              backgroundColor: tokens.colors.surface,
              paddingHorizontal: tokens.spacing.xl,
              paddingTop: tokens.spacing.md,
              paddingBottom: Math.max(insets.bottom, tokens.spacing.xl),
            }}
          >
            <View accessibilityViewIsModal>{children}</View>
          </KeyboardAvoidingView>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}
