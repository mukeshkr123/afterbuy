import React from "react";
import { Linking, Text, View } from "react-native";
import { Button, ScreenHeader, ScreenScroll, SectionCard } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from "@/lib/publicLinks";

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
          {PRIVACY_POLICY_URL ? (
            <Button
              label="Open privacy policy"
              variant="secondary"
              onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
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
