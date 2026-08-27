import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    expanded: width >= 768,
    landscape: width > height,
    contentWidth: width >= 1024 ? 880 : width >= 768 ? 720 : width,
  };
}

export function AdaptiveScreen({
  children,
  scroll = true,
  compact = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useAdaptiveLayout();
  const contentStyle: ViewStyle = {
    width: "100%",
    maxWidth: compact ? 560 : contentWidth,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.xl - 4,
    paddingTop: tokens.spacing.lg,
    paddingBottom: Math.max(insets.bottom + tokens.spacing.xl, 32),
    gap: tokens.spacing.xl,
  };

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[contentStyle, style]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[contentStyle, { flex: 1 }, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
