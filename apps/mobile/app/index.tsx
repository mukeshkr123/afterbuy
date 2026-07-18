import { Redirect } from "expo-router";
import { useAuth } from "@/auth/useAuth";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/(auth)/sign-in" />
  );
}
