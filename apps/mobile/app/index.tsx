import { Redirect } from "expo-router";
import { useAuth } from "@/auth/useAuth";
import WelcomeScreen from "./welcome";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Redirect href="/(tabs)" /> : <WelcomeScreen />;
}
