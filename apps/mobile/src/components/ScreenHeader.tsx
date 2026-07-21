import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";

export interface ScreenHeaderAction {
  /** Ionicons glyph name, e.g. "add" or "ellipsis-horizontal". */
  icon: keyof typeof Ionicons.glyphMap;
  /** Required — icon-only controls are invisible to screen readers without it. */
  label: string;
  onPress: () => void;
}

export interface ScreenHeaderProps {
  title: string;
  /** Omit to hide the back control (root tab screens). */
  onBack?: (() => void) | undefined;
  showBack?: boolean | undefined;
  action?: ScreenHeaderAction | undefined;
}

/**
 * The back / title / action bar repeated across every non-root screen.
 *
 * Controls are 44×44 to satisfy WCAG 2.5.5; the visual glyph stays small, the
 * hit area does not.
 */
export function ScreenHeader({
  title,
  onBack,
  showBack = true,
  action,
}: ScreenHeaderProps) {
  const { tokens } = useTheme();
  const router = useRouter();

  // Deep links can land on a screen with no history — fall back to the tab root
  // rather than leaving a dead back button.
  const goBack =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    });

  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.control, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={24} color={tokens.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.control} />
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: tokens.colors.text,
            fontSize: tokens.type.body.fontSize + 2,
          },
        ]}
      >
        {title}
      </Text>

      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={({ pressed }) => [
            styles.control,
            styles.controlEnd,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name={action.icon} size={22} color={tokens.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.control} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  control: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  controlEnd: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
