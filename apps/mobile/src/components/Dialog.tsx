import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
  destructive?: boolean;
  children?: ReactNode;
}

export function Dialog({
  visible,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onDismiss,
  destructive,
  children,
}: DialogProps) {
  const { tokens } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.text,
              fontSize: tokens.type.title.fontSize,
              fontWeight: "700",
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
                marginTop: tokens.spacing.xs,
              }}
            >
              {description}
            </Text>
          ) : null}
          {children}
          <View
            style={[
              styles.actions,
              { marginTop: tokens.spacing.lg, gap: tokens.spacing.sm },
            ]}
          >
            {secondaryLabel ? (
              <Pressable
                onPress={onSecondary ?? onDismiss}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    borderRadius: tokens.radius.md,
                    paddingVertical: tokens.spacing.sm + 2,
                    backgroundColor: tokens.colors.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}
            {primaryLabel ? (
              <Pressable
                onPress={onPrimary}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    borderRadius: tokens.radius.md,
                    paddingVertical: tokens.spacing.sm + 2,
                    backgroundColor: destructive
                      ? tokens.colors.danger
                      : tokens.colors.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: tokens.colors.accentText,
                    fontSize: tokens.type.body.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {primaryLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  actionButton: {
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: "center",
  },
});
