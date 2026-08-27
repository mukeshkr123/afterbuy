import React from "react";
import { Linking, Text, View } from "react-native";
import { Button, ScreenHeader, ScreenScroll, SectionCard } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const SUPPORT_EMAIL =
  process.env["EXPO_PUBLIC_SUPPORT_EMAIL"] ?? "support@afterbuy.app";

export default function SupportScreen() {
  const { tokens } = useTheme();
  return (
    <ScreenScroll gap={tokens.spacing.lg}>
      <ScreenHeader title="Support" />
      <SectionCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            For help with your account, purchases, receipts, reminders, claims,
            or data deletion, contact {SUPPORT_EMAIL}.
          </Text>
          <Button
            label="Email support"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>
      </SectionCard>
    </ScreenScroll>
  );
}
