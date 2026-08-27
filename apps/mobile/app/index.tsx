import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { readSettings } from "@/lib/settings";
import WelcomeScreen from "./welcome";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pendingOnboarding, setPendingOnboarding] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setPendingOnboarding(false);
      return;
    }
    let alive = true;
    void readSettings().then((settings) => {
      if (alive) setPendingOnboarding(settings.authOnboardingPending);
    });
    return () => {
      alive = false;
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <WelcomeScreen />;
  if (pendingOnboarding === null) return null;
  return pendingOnboarding ? (
    <Redirect href="/onboarding/permissions" />
  ) : (
    <Redirect href="/(tabs)" />
  );
}
