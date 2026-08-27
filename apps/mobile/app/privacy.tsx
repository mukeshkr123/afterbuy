import React from "react";
import { Text, View } from "react-native";
import { ScreenHeader, ScreenScroll, SectionCard } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const SUPPORT_EMAIL =
  process.env["EXPO_PUBLIC_SUPPORT_EMAIL"] ?? "support@afterbuy.app";

export default function PrivacyPolicyScreen() {
  const { tokens } = useTheme();
  return (
    <ScreenScroll gap={tokens.spacing.lg}>
      <ScreenHeader title="Privacy Policy" />
      <SectionCard>
        <View style={{ gap: tokens.spacing.md }}>
          <Body>
            AfterBuy stores the purchase, receipt, reminder, claim, and account
            information you add so the app can provide purchase management,
            receipt storage, and reminder notifications.
          </Body>
          <Body>
            We use Clerk for authentication and Cloudflare for API, database,
            queue, and receipt storage infrastructure. Receipt files are used
            only to provide the app features you request.
          </Body>
          <Body>
            You can request deletion in the app from Settings, or contact{" "}
            {SUPPORT_EMAIL}. Account deletion permanently removes app data and
            receipt files.
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
