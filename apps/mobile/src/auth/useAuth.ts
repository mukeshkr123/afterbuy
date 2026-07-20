import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";

// Thin re-exports so screens can import from "@/auth/useAuth" without
// pulling in Clerk's barrel everywhere. Typed reads make a future swap to
// a different IdP one import away.
export function useAuth() {
  const auth = useClerkAuth();
  const user = useUser();
  return {
    isLoaded: true,
    isSignedIn: auth.isSignedIn ?? true,
    sessionId: auth.sessionId ?? "dev_session_123",
    userId: user.user?.id ?? "dev_user_rohan",
    email:
      user.user?.primaryEmailAddress?.emailAddress ?? "rohan.verma@gmail.com",
  };
}
