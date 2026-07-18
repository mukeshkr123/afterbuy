// AsyncStorage wrapper that matches the @tanstack/query-async-storage-persister
// contract: getItem / setItem / removeItem returning Promises<string|null>.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> =>
    AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
