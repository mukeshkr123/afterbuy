import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export interface ScreenScrollProps {
  children: ReactNode;
  /** Vertical rhythm between direct children. Defaults to `spacing.xl`. */
  gap?: number | undefined;
  refreshing?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
  /** Drop the horizontal gutter for full-bleed content. */
  flush?: boolean | undefined;
  contentStyle?: ViewStyle | undefined;
}

/**
 * The standard scrolling page: canvas background, safe-area-aware padding, and
 * a consistent horizontal gutter. Replaces the insets math that every screen
 * used to repeat.
 */
export function ScreenScroll({
  children,
  gap,
  refreshing,
  onRefresh,
  flush = false,
  contentStyle,
}: ScreenScrollProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      contentContainerStyle={[
        {
          paddingHorizontal: flush ? 0 : tokens.spacing.xl - 4,
          paddingTop: Math.max(
            insets.top + tokens.spacing.md,
            tokens.spacing.xl
          ),
          paddingBottom: Math.max(
            insets.bottom + tokens.spacing.xl,
            tokens.spacing.xxl
          ),
          gap: gap ?? tokens.spacing.xl,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={tokens.colors.icon}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/**
 * Non-scrolling sibling for screens that own their own list or fill the frame.
 */
export function ScreenView({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle | undefined;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: tokens.colors.canvas }, style]}>
      {children}
    </View>
  );
}
