import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Backwards-compatible deep link. Search now lives in Purchases, but existing
 * `/search?q=…` links continue to land on the same result set.
 */
export default function SearchRedirect() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <Redirect
      href={{
        pathname: "/(tabs)/purchases",
        params: q ? { q } : {},
      }}
    />
  );
}
