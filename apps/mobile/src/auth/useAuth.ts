import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";

// Thin re-exports so screens can import from "@/auth/useAuth" without
// pulling in Clerk's barrel everywhere. Typed reads make a future swap to
// a different IdP one import away.
export function useAuth() {
  const auth = useClerkAuth();
  const user = useUser();
  return {
    isLoaded: Boolean(auth.isLoaded && user.isLoaded),
    isSignedIn: Boolean(auth.isSignedIn),
    sessionId: auth.sessionId ?? null,
    userId: user.user?.id ?? null,
    email: user.user?.primaryEmailAddress?.emailAddress ?? null,
  };
}
