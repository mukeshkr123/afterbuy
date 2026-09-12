import React from "react";
import { Linking, Text, View } from "react-native";
import { Button, ScreenHeader, ScreenScroll, SectionCard } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import { SUPPORT_EMAIL, TERMS_URL } from "@/lib/publicLinks";

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
          {TERMS_URL ? (
            <Button
              label="Open terms"
              variant="secondary"
              onPress={() => void Linking.openURL(TERMS_URL)}
            />
          ) : null}
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
