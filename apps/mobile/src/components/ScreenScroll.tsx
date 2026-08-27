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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      contentContainerStyle={[
        {
          width: "100%",
          maxWidth,
          alignSelf: "center",
          paddingHorizontal: flush ? 0 : tokens.spacing.xl - 4,
          paddingTop: Math.max(
            (safeTop ? insets.top : 0) + tokens.spacing.md,
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
