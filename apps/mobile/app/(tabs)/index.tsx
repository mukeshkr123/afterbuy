import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ListItem,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { getMe } from "@/api/auth";
import { listPurchases } from "@/api/purchases";
import { useTheme } from "@/theme/ThemeProvider";
import { addDays, daysBetween, todayIso } from "@/lib/date";

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const { tokens } = useTheme();
  const me = useQuery({ queryKey: apiKeys.me(), queryFn: () => getMe(api) });
  const recent = useQuery({
    queryKey: apiKeys.purchases.list({ sort: "createdAt", limit: 5 }),
    queryFn: () => listPurchases(api, { sort: "createdAt", limit: 5 }),
  });

  const today = todayIso();
  const horizon = addDays(today, 30);
  const upcoming = (recent.data?.items ?? [])
    .filter(
      (p) =>
        p.returnDeadlineAt !== null &&
        p.returnDeadlineAt >= today &&
        p.returnDeadlineAt <= horizon
    )
    .sort((a, b) => {
      const aDate = a.returnDeadlineAt ?? "";
      const bDate = b.returnDeadlineAt ?? "";
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
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
        {me.data ? `Hi, ${me.data.email?.split("@")[0] ?? "there"}` : "Home"}
      </Text>
      <Button
        label="+ Quick add purchase"
        onPress={() => router.push("/purchase/new")}
      />

      <Card title="Upcoming deadlines">
        {recent.isLoading ? (
          <SkeletonGroup count={3} />
        ) : upcoming.length === 0 ? (
          <EmptyState title="Nothing due in the next 30 days" />
        ) : (
          <View style={{ gap: tokens.spacing.sm }}>
            {upcoming.map((p) => (
              <ListItem
                key={p.id}
                title={p.title}
                subtitle={`Return by ${p.returnDeadlineAt}`}
                trailing={
                  <StatusPill
                    label={deadlineLabel(p.returnDeadlineAt ?? "", today)}
                    tone={deadlineTone(p.returnDeadlineAt ?? "", today)}
                  />
                }
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: p.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </Card>

      <Card title="Recent purchases">
        {recent.isLoading ? (
          <SkeletonGroup count={3} />
        ) : (recent.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="No purchases yet"
            message="Tap Quick add to start."
          />
        ) : (
          <View style={{ gap: tokens.spacing.sm }}>
            {(recent.data?.items ?? []).map((p) => (
              <ListItem
                key={p.id}
                title={p.title}
                subtitle={p.merchant ?? p.category}
                onPress={() =>
                  router.push({
                    pathname: "/purchase/[id]",
                    params: { id: p.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function deadlineLabel(dateIso: string, todayIso: string): string {
  const days = daysBetween(todayIso, dateIso);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function deadlineTone(
  dateIso: string,
  todayIso: string
): "warning" | "danger" | "neutral" {
  const days = daysBetween(todayIso, dateIso);
  if (days <= 3) return "danger";
  if (days <= 14) return "warning";
  return "neutral";
}
