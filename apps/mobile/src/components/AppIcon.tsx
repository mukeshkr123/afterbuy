import { Ionicons } from "@expo/vector-icons";
import { Host, Icon } from "@expo/ui";
import { Platform, type ColorValue } from "react-native";

export type AppIconName =
  | "home"
  | "purchases"
  | "reminders"
  | "account"
  | "search"
  | "filter"
  | "add"
  | "camera"
  | "image"
  | "claims"
  | "check"
  | "settings"
  | "calendar"
  | "back"
  | "close";

const IOS = {
  home: "house",
  purchases: "receipt",
  reminders: "bell",
  account: "person.crop.circle",
  search: "magnifyingglass",
  filter: "line.3.horizontal.decrease",
  add: "plus",
  camera: "camera",
  image: "photo",
  claims: "shield",
  check: "checkmark.circle",
  settings: "gearshape",
  calendar: "calendar",
  back: "chevron.left",
  close: "xmark",
} as const;

const ANDROID = {
  home: import("@expo/material-symbols/home.xml"),
  purchases: import("@expo/material-symbols/receipt.xml"),
  reminders: import("@expo/material-symbols/notifications.xml"),
  account: import("@expo/material-symbols/person.xml"),
  search: import("@expo/material-symbols/search.xml"),
  filter: import("@expo/material-symbols/filter_list.xml"),
  add: import("@expo/material-symbols/add.xml"),
  camera: import("@expo/material-symbols/photo_camera.xml"),
  image: import("@expo/material-symbols/image.xml"),
  claims: import("@expo/material-symbols/shield.xml"),
  check: import("@expo/material-symbols/check_circle.xml"),
  settings: import("@expo/material-symbols/settings.xml"),
  calendar: import("@expo/material-symbols/calendar_today.xml"),
  back: import("@expo/material-symbols/arrow_back.xml"),
  close: import("@expo/material-symbols/close.xml"),
} as const;

const WEB: Record<AppIconName, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  purchases: "receipt-outline",
  reminders: "notifications-outline",
  account: "person-outline",
  search: "search-outline",
  filter: "funnel-outline",
  add: "add",
  camera: "camera-outline",
  image: "image-outline",
  claims: "shield-checkmark-outline",
  check: "checkmark-circle-outline",
  settings: "settings-outline",
  calendar: "calendar-outline",
  back: "chevron-back",
  close: "close",
};

export function AppIcon({
  name,
  size = 24,
  color,
  accessibilityLabel,
}: {
  name: AppIconName;
  size?: number;
  color: ColorValue;
  accessibilityLabel?: string;
}) {
  if (Platform.OS === "web") {
    return (
      <Ionicons
        name={WEB[name]}
        size={size}
        color={String(color)}
        {...(accessibilityLabel ? { accessibilityLabel } : {})}
      />
    );
  }

  return (
    <Host matchContents>
      <Icon
        name={Icon.select({ ios: IOS[name], android: ANDROID[name] })}
        size={size}
        color={color}
        {...(accessibilityLabel ? { accessibilityLabel } : {})}
      />
    </Host>
  );
}
