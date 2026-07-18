import { useClerk, useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import {
  Button,
  Card,
  ListItem,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { getMe } from "@/api/auth";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const api = useApi();
  const { tokens } = useTheme();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(api),
    enabled: Boolean(user),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
      contentContainerStyle={{
        padding: tokens.spacing.lg,
        gap: tokens.spacing.lg,
      }}
    >
      <Text
        style={{
          fontSize: tokens.type.display.fontSize,
          fontWeight: "700",
          color: tokens.colors.text,
        }}
      >
        Profile
      </Text>

      <Card title="Account">
        <View style={{ gap: tokens.spacing.sm }}>
          <ListItem
            title={user?.primaryEmailAddress?.emailAddress ?? "—"}
            subtitle="Email"
          />
          <ListItem
            title={user?.username ?? user?.firstName ?? "—"}
            subtitle="Display name"
          />
          <View style={{ padding: tokens.spacing.md }}>
            <StatusPill label="Signed in" tone="success" />
          </View>
        </View>
      </Card>

      <Card title="Settings">
        {me.isLoading ? (
          <SkeletonGroup count={3} />
        ) : me.isError ? (
          <Text style={{ color: tokens.colors.danger }}>
            Couldn't load settings.
          </Text>
        ) : me.data ? (
          <View style={{ gap: tokens.spacing.sm }}>
            <ListItem
              title={`${me.data.reminderLeadDays} days`}
              subtitle="Reminder lead time"
            />
            <ListItem
              title={me.data.pushEnabled ? "Enabled" : "Disabled"}
              subtitle="Push notifications"
            />
            <ListItem title={me.data.timezone} subtitle="Timezone" />
          </View>
        ) : (
          <ActivityIndicator color={tokens.colors.accent} />
        )}
      </Card>

      <Button
        label="Sign out"
        variant="danger"
        onPress={() => {
          void signOut();
        }}
      />
    </ScrollView>
  );
}
