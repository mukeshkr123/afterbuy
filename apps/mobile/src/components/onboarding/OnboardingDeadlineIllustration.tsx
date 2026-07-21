import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export function OnboardingDeadlineIllustration() {
  const { tokens, isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={styles.container}>
      {/* Subtle ambient glow */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isLight
              ? "rgba(79, 70, 229, 0.06)"
              : "rgba(129, 140, 248, 0.08)",
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
                size={16}
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
                Automatic notifications active
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
                { backgroundColor: isLight ? "#E0E7FF" : "#312E81" },
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
                <Ionicons name="time" size={11} color={tokens.colors.warning} />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text
                    style={[styles.stepTitle, { color: tokens.colors.text }]}
                  >
                    Return Window Ends
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
                      3 Days Left
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.stepDate, { color: tokens.colors.textMuted }]}
                >
                  Oct 28 · Amazon Order #1049
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
                  size={11}
                  color={tokens.colors.accent}
                />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: tokens.colors.text }]}>
                  Warranty Protection
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

        {/* Floating Smart Alert Notification Card (Positioned below without covering content) */}
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
              name="notifications"
              size={14}
              color={tokens.colors.accent}
            />
          </View>
          <View style={styles.notificationTextCol}>
            <Text style={[styles.notifTitle, { color: tokens.colors.text }]}>
              Smart Alert Scheduled
            </Text>
            <Text style={[styles.notifSub, { color: tokens.colors.textMuted }]}>
              Push reminder 48h before expiry
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
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ambientGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  deckContainer: {
    width: "100%",
    maxWidth: 328,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  timelineCard: {
    width: "94%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 2,
    marginTop: -20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shieldBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "500",
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
    left: 9,
    top: 6,
    bottom: 8,
    width: 2,
    borderRadius: 1,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontWeight: "700",
  },
  alertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 10,
    fontWeight: "800",
  },
  stepDate: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  notificationBanner: {
    position: "absolute",
    bottom: 2,
    width: "88%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 4,
  },
  bellBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTextCol: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  notifSub: {
    fontSize: 11,
    fontWeight: "500",
  },
});
