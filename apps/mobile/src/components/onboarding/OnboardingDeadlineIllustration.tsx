import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export function OnboardingDeadlineIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { tokens, isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {/* Ultra-subtle ambient glow */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isLight
              ? "rgba(79, 70, 229, 0.03)"
              : "rgba(129, 140, 248, 0.04)",
          },
        ]}
      />

      <View style={styles.deckContainer}>
        {/* Main Timeline Card */}
        <View
          style={[
            styles.timelineCard,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              ...tokens.shadow.card,
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.shieldBadge,
                { backgroundColor: tokens.colors.accentSoft },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={15}
                color={tokens.colors.accent}
              />
            </View>
            <View style={styles.headerTitles}>
              <Text style={[styles.titleText, { color: tokens.colors.text }]}>
                Deadline Protection
              </Text>
              <Text
                style={[
                  styles.subtitleText,
                  { color: tokens.colors.textMuted },
                ]}
              >
                Active reminders
              </Text>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: tokens.colors.border }]}
          />

          {/* Timeline Steps */}
          <View style={styles.timelineBody}>
            {/* Timeline Line Vertical */}
            <View
              style={[
                styles.verticalLine,
                { backgroundColor: isLight ? "#E5E7EB" : "#272732" },
              ]}
            />

            {/* Step 1: Return Window */}
            <View style={styles.timelineStep}>
              <View
                style={[
                  styles.stepNode,
                  {
                    backgroundColor: tokens.colors.warningSoft,
                    borderColor: tokens.colors.warning,
                  },
                ]}
              >
                <Ionicons name="time" size={10} color={tokens.colors.warning} />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text
                    style={[styles.stepTitle, { color: tokens.colors.text }]}
                  >
                    Return window
                  </Text>
                  <View
                    style={[
                      styles.alertBadge,
                      { backgroundColor: tokens.colors.warningSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.alertText,
                        { color: tokens.colors.warning },
                      ]}
                    >
                      3 days left
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.stepDate, { color: tokens.colors.textMuted }]}
                >
                  Oct 28 · Store return deadline
                </Text>
              </View>
            </View>

            {/* Step 2: Warranty Protection */}
            <View style={styles.timelineStep}>
              <View
                style={[
                  styles.stepNode,
                  {
                    backgroundColor: tokens.colors.accentSoft,
                    borderColor: tokens.colors.accent,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={tokens.colors.accent}
                />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: tokens.colors.text }]}>
                  Warranty
                </Text>
                <Text
                  style={[styles.stepDate, { color: tokens.colors.textMuted }]}
                >
                  Protected until Oct 2028
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Floating Reminder Banner */}
        <View
          style={[
            styles.notificationBanner,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              ...tokens.shadow.raised,
            },
          ]}
        >
          <View
            style={[
              styles.bellBox,
              { backgroundColor: tokens.colors.accentSoft },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={13}
              color={tokens.colors.accent}
            />
          </View>
          <View style={styles.notificationTextCol}>
            <Text style={[styles.notifTitle, { color: tokens.colors.text }]}>
              Reminder set
            </Text>
            <Text style={[styles.notifSub, { color: tokens.colors.textMuted }]}>
              2 days before expiry
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  compact: {
    transform: [{ scale: 0.76 }],
  },
  ambientGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  deckContainer: {
    width: "100%",
    maxWidth: 324,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  timelineCard: {
    width: "95%",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 2,
    marginTop: -16,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  timelineBody: {
    position: "relative",
    gap: 10,
    paddingLeft: 2,
  },
  verticalLine: {
    position: "absolute",
    left: 8,
    top: 6,
    bottom: 8,
    width: 1.5,
    borderRadius: 1,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  stepNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    marginTop: 1,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  alertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 10,
    fontWeight: "700",
  },
  stepDate: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 1,
  },
  notificationBanner: {
    position: "absolute",
    bottom: 2,
    width: "88%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 4,
  },
  bellBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTextCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  notifSub: {
    fontSize: 11,
    fontWeight: "400",
  },
});
