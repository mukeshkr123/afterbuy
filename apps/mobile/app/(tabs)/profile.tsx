import { useClerk, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ListItem,
  SkeletonGroup,
  StatusPill,
  Switch,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { useTheme } from "@/theme/ThemeProvider";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens, preference, setPreference } = useTheme();

  const me = useQuery({
    queryKey: apiKeys.me(),
    queryFn: () => getMe(api),
    enabled: Boolean(user),
  });

  const updatePush = useMutation({
    mutationFn: async (next: boolean) => {
      // Update push preference via /v1/me; theme preference is local-only.
      const { patchMe } = await import("@/api/auth");
      return patchMe(api, { pushEnabled: next });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeys.me() }),
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

      <Card title="Notifications">
        <ListItem
          title="Push notifications"
          subtitle={me.data?.pushEnabled ? "Enabled" : "Disabled"}
          trailing={
            <Switch
              value={Boolean(me.data?.pushEnabled)}
              onValueChange={(v) => updatePush.mutate(v)}
              accessibilityLabel="Push notifications"
            />
          }
        />
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
              trailing={<Badge label="Edit" tone="neutral" />}
              onPress={() => router.push("/settings/lead-days")}
            />
            <ListItem
              title={me.data.timezone}
              subtitle="Timezone"
              trailing={<Badge label="Edit" tone="neutral" />}
              onPress={() => router.push("/settings/timezone")}
            />
            <ListItem
              title="Appearance"
              subtitle={
                preference === "system"
                  ? "Follow system"
                  : preference === "dark"
                    ? "Dark"
                    : "Light"
              }
              trailing={
                <View
                  style={{
                    flexDirection: "row",
                    gap: tokens.spacing.xs,
                  }}
                >
                  {(["system", "light", "dark"] as const).map((p) => (
                    <Button
                      key={p}
                      label={p[0]?.toUpperCase() ?? ""}
                      variant={preference === p ? "primary" : "ghost"}
                      onPress={() => void setPreference(p)}
                    />
                  ))}
                </View>
              }
            />
          </View>
        ) : null}
      </Card>

      <Card title="Danger zone">
        <Button
          label="Delete account"
          variant="danger"
          onPress={() => router.push("/delete-account")}
        />
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void signOut();
          }}
        />
      </Card>
    </ScrollView>
  );
}
