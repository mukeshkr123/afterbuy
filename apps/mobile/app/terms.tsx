import React from "react";
import { Text, View } from "react-native";
import { ScreenHeader, ScreenScroll, SectionCard } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const SUPPORT_EMAIL =
  process.env["EXPO_PUBLIC_SUPPORT_EMAIL"] ?? "support@afterbuy.app";

export default function TermsScreen() {
  const { tokens } = useTheme();
  return (
    <ScreenScroll gap={tokens.spacing.lg}>
      <ScreenHeader title="Terms of Service" />
      <SectionCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Body>
            AfterBuy helps you track purchases, receipts, return windows,
            warranties, delivery status, and related claims. You are responsible
            for the accuracy of information you enter.
          </Body>
          <Body>
            Reminder notifications are provided on a best-effort basis and do
            not replace merchant, warranty provider, carrier, or legal
            deadlines.
          </Body>
          <Body>
            Do not upload unlawful, sensitive, or unrelated files. For support
            or account questions, contact {SUPPORT_EMAIL}.
          </Body>
        </View>
      </SectionCard>
    </ScreenScroll>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={{
        color: tokens.colors.textMuted,
        fontSize: tokens.type.body.fontSize,
        lineHeight: tokens.type.body.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}
