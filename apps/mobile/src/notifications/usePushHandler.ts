import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Foreground handler — show banner while app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  purchaseId?: string;
  reminderId?: string;
  type?: string;
}

export function usePushTapHandler() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationData | null;
        if (data?.purchaseId) {
          router.push({
            pathname: "/purchase/[id]",
            params: {
              id: data.purchaseId,
              ...(data.reminderId ? { reminderId: data.reminderId } : {}),
            },
          });
        }
      }
    );
    return () => sub.remove();
  }, []);
}
