import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

// Secure-store backed token cache for Clerk. Wraps every method in a
// try/catch because the simulator occasionally throws on secure-store I/O;
// fail open (treat as missing) so the auth UI can re-prompt for sign-in.
export const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItem(key);
    } catch {
      return null;
    }
  },
  async saveToken(key, token) {
    try {
      await SecureStore.setItemAsync(key, token);
    } catch {
      // best-effort
    }
  },
  async clearToken(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // best-effort
    }
  },
};
