import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Button,
  EmptyState,
  IconTile,
  ListItem,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
  SkeletonGroup,
  StatusPill,
} from "@/components";
import { useApi } from "@/api/ApiProvider";
import { apiKeys } from "@/api/apiKeys";
import { listClaims } from "@/api/claims";
import { fromCaught } from "@/hooks/useApiError";
import { CLAIM_STATUS_LABEL, CLAIM_TYPE_LABEL, statusTone } from "@/lib/claims";
import { formatDate } from "@/lib/purchaseDisplay";
import { useTheme } from "@/theme/ThemeProvider";

export default function ClaimsScreen() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const list = useQuery({
    queryKey: apiKeys.claims.list({ purchaseId: id ?? "" }),
    queryFn: () => listClaims(api, { purchaseId: id ?? "" }),
    enabled: Boolean(id),
  });

  // Refresh when the screen mounts after a successful create.
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["claims"] });
  }, [qc]);

  const items = list.data?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenScroll gap={tokens.spacing.lg + 2}>
        <ScreenHeader title="Claims" />

        {list.isLoading ? (
          <SkeletonGroup count={3} gap={tokens.spacing.md} />
        ) : list.isError ? (
          <SectionCard>
            <EmptyState
              icon="alert-circle-outline"
              title="Couldn't load claims"
              message={fromCaught(list.error).message ?? "Try again."}
              action={{
                label: "Try again",
                onPress: () => void list.refetch(),
              }}
            />
          </SectionCard>
        ) : items.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon="shield-checkmark-outline"
              title="No claims yet"
              message="Open a return or warranty claim when something goes wrong with this purchase."
            />
          </SectionCard>
        ) : (
          <SectionCard flush>
            {items.map((c, idx) => (
              <ListItem
                key={c.id}
                title={CLAIM_TYPE_LABEL[c.type]}
                subtitle={`Opened ${formatDate(c.openedAt.slice(0, 10)) ?? ""}`}
                divider={idx < items.length - 1}
                leading={
                  <IconTile icon="shield-checkmark-outline" tone="accent" />
                }
                trailing={
                  <StatusPill
                    label={CLAIM_STATUS_LABEL[c.status]}
                    tone={statusTone(c.status)}
                  />
                }
                chevron
                onPress={() =>
                  router.push({
                    pathname: "/claim/[id]",
                    params: { id: c.id },
                  })
                }
              />
            ))}
          </SectionCard>
        )}

        <Button
          label="Open a claim"
          onPress={() =>
            router.push({
              pathname: "/claim/new",
              params: { purchaseId: id ?? "" },
            })
          }
        />
      </ScreenScroll>
    </>
  );
}
