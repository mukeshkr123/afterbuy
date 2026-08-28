import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export interface ScreenScrollProps {
  children: ReactNode;
  /** Vertical rhythm between direct children. Defaults to `spacing.xl`. */
  gap?: number | undefined;
  density?: "default" | "compact" | undefined;
  refreshing?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
  /** Drop the horizontal gutter for full-bleed content. */
  flush?: boolean | undefined;
  /** Set false when a native navigator header already owns the top inset. */
  safeTop?: boolean | undefined;
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
  density = "default",
  refreshing,
  onRefresh,
  flush = false,
  safeTop = true,
  contentStyle,
}: ScreenScrollProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = width >= 1024 ? 880 : width >= 768 ? 720 : undefined;
  const compactPhone = density === "compact" || width < 390;
  const horizontalPadding = flush
    ? 0
    : width >= 768
      ? tokens.spacing.xl
      : compactPhone
        ? tokens.spacing.lg
        : tokens.spacing.xl - 2;
  const topPadding = compactPhone ? tokens.spacing.sm : tokens.spacing.md;
  const bottomPadding = compactPhone ? tokens.spacing.xl : tokens.spacing.xxl;
  const contentGap =
    gap ?? (compactPhone ? tokens.spacing.lg : tokens.spacing.xl);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      contentContainerStyle={[
        {
          width: "100%",
          maxWidth,
          alignSelf: "center",
          paddingHorizontal: horizontalPadding,
          paddingTop: Math.max(
            (safeTop ? insets.top : 0) + topPadding,
            compactPhone ? tokens.spacing.lg : tokens.spacing.xl
          ),
          paddingBottom: Math.max(
            insets.bottom + tokens.spacing.xl,
            bottomPadding
          ),
          gap: contentGap,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
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
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.canvas }}>
      <View
        style={[
          {
            flex: 1,
            width: "100%",
            maxWidth: width >= 1024 ? 960 : undefined,
            alignSelf: "center",
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
