import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppIcon,
  AppText,
  Button,
  CategoryArtwork,
  DeadlineCard,
  Input,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SectionHeading,
  SegmentedControl,
  StatusPill,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const SWATCHES = [
  ["Primary", "primary"],
  ["Canvas", "canvas"],
  ["Surface", "surface"],
  ["Muted", "surfaceMuted"],
  ["Success", "successSoft"],
  ["Warning", "warningSoft"],
  ["Danger", "dangerSurface"],
] as const;

export default function DesignSystemScreen() {
  const { tokens, preference, setPreference } = useTheme();
  const [segment, setSegment] = useState("upcoming");
  const [input, setInput] = useState("");

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScreenScroll gap={tokens.spacing.xxl}>
      <ScreenHeader title="Design System" />
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText role="largeTitle" tone="strong">
          AfterBuy
        </AppText>
        <AppText role="body" tone="subtle">
          Calm, precise, reassuring. Development catalog only.
        </AppText>
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Appearance" detail={`Current: ${preference}`} />
        <SegmentedControl
          tabs={[
            { key: "system", label: "System" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
          ]}
          activeKey={preference}
          onChange={(value) => void setPreference(value as typeof preference)}
        />
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Color roles" />
        <View style={styles.swatches}>
          {SWATCHES.map(([label, key]) => (
            <View key={key} style={styles.swatchItem}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: tokens.colors[key],
                    borderColor: tokens.colors.border,
                  },
                ]}
              />
              <AppText role="caption" tone="subtle">
                {label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Type hierarchy" />
        <AppText role="largeTitle">Large title</AppText>
        <AppText role="screenTitle">Screen title</AppText>
        <AppText role="title">Title</AppText>
        <AppText role="sectionTitle">Section title</AppText>
        <AppText role="headline">Headline</AppText>
        <AppText>
          Body text stays readable and follows native text scaling.
        </AppText>
        <AppText role="subheadline" tone="subtle">
          Supporting detail
        </AppText>
        <AppText role="caption" tone="muted">
          Helpful metadata
        </AppText>
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Actions" />
        <Button
          label="Primary action"
          onPress={() => undefined}
          leading={
            <AppIcon
              name="add"
              size={18}
              color={tokens.colors.action.onPrimary}
            />
          }
        />
        <Button
          label="Secondary action"
          variant="secondary"
          onPress={() => undefined}
        />
        <Button
          label="Tertiary action"
          variant="tertiary"
          onPress={() => undefined}
        />
        <Button label="Busy action" busy onPress={() => undefined} />
        <Button label="Disabled action" disabled onPress={() => undefined} />
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Inputs and selection" />
        <Input
          label="Purchase"
          value={input}
          onChangeText={setInput}
          placeholder="Search purchases"
          hint="Labels and helper text remain visible at large text sizes."
        />
        <SegmentedControl
          tabs={[
            { key: "upcoming", label: "Upcoming" },
            { key: "history", label: "History" },
          ]}
          activeKey={segment}
          onChange={setSegment}
        />
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Status" />
        <View style={styles.rowWrap}>
          <StatusPill label="In return window" tone="accent" />
          <StatusPill label="Delivered" tone="success" />
          <StatusPill label="Expiring soon" tone="warning" />
          <StatusPill label="Expired" tone="danger" />
        </View>
        <DeadlineCard
          title="Return window"
          dateLabel="Return by Sep 1, 2026"
          detail="5 days left"
          tone="success"
        />
        <DeadlineCard
          title="Warranty"
          dateLabel="Coverage until Aug 20, 2027"
          detail="359 days left"
        />
      </View>

      <View style={{ gap: tokens.spacing.md }}>
        <SectionHeading title="Grouped content" />
        <SectionCard flush>
          <Pressable
            style={[styles.purchaseRow, { padding: tokens.spacing.lg }]}
          >
            <CategoryArtwork category="electronics" />
            <View style={styles.purchaseCopy}>
              <AppText role="headline">Wireless Headphones</AppText>
              <AppText role="caption" tone="subtle">
                Best Buy · Aug 20, 2026
              </AppText>
            </View>
            <StatusPill label="12 days left" tone="success" />
          </Pressable>
        </SectionCard>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatchItem: { width: 72, gap: 6 },
  swatch: {
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  purchaseRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  purchaseCopy: { flex: 1, gap: 2 },
});
