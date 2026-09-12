import React from "react";
import { Linking, Text, View } from "react-native";
import {
  Button,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  mailtoSupport,
} from "@/lib/publicLinks";

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
            onPress={() => void Linking.openURL(mailtoSupport())}
          />
        </View>
      </SectionCard>
      <SectionCard flush>
        <ListItem
          title="Help Center"
          subtitle="Guides for purchases, receipts, reminders, and claims"
          leading={<IconTile icon="help-circle-outline" tone="neutral" />}
        />
        <ListItem
          title="Contact Support"
          subtitle="We typically respond within 24 hours."
          divider={Boolean(PRIVACY_POLICY_URL || ACCOUNT_DELETION_URL)}
          leading={<IconTile icon="mail-outline" tone="neutral" />}
          chevron
          onPress={() => void Linking.openURL(mailtoSupport())}
        />
        {PRIVACY_POLICY_URL ? (
          <ListItem
            title="Privacy Policy"
            subtitle="How AfterBuy handles your data"
            divider={Boolean(ACCOUNT_DELETION_URL)}
            leading={<IconTile icon="document-text-outline" tone="neutral" />}
            chevron
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
        ) : null}
        {ACCOUNT_DELETION_URL ? (
          <ListItem
            title="Account Deletion"
            subtitle="Request deletion from the web"
            divider={false}
            leading={<IconTile icon="trash-outline" tone="warning" />}
            chevron
            onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}
          />
        ) : null}
      </SectionCard>
    </ScreenScroll>
  );
}
