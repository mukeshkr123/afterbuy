import { Ionicons } from "@expo/vector-icons";
import { Host, Icon } from "@expo/ui";
import { Platform, type ColorValue } from "react-native";
import AddIcon from "@expo/material-symbols/add.xml";
import ArrowBackIcon from "@expo/material-symbols/arrow_back.xml";
import CalendarTodayIcon from "@expo/material-symbols/calendar_today.xml";
import CheckCircleIcon from "@expo/material-symbols/check_circle.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import FilterListIcon from "@expo/material-symbols/filter_list.xml";
import HomeIcon from "@expo/material-symbols/home.xml";
import ImageIcon from "@expo/material-symbols/image.xml";
import NotificationsIcon from "@expo/material-symbols/notifications.xml";
import PersonIcon from "@expo/material-symbols/person.xml";
import PhotoCameraIcon from "@expo/material-symbols/photo_camera.xml";
import ReceiptIcon from "@expo/material-symbols/receipt.xml";
import SearchIcon from "@expo/material-symbols/search.xml";
import SettingsIcon from "@expo/material-symbols/settings.xml";
import ShieldIcon from "@expo/material-symbols/shield.xml";

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
  home: HomeIcon,
  purchases: ReceiptIcon,
  reminders: NotificationsIcon,
  account: PersonIcon,
  search: SearchIcon,
  filter: FilterListIcon,
  add: AddIcon,
  camera: PhotoCameraIcon,
  image: ImageIcon,
  claims: ShieldIcon,
  check: CheckCircleIcon,
  settings: SettingsIcon,
  calendar: CalendarTodayIcon,
  back: ArrowBackIcon,
  close: CloseIcon,
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
        name={Platform.OS === "android" ? ANDROID[name] : IOS[name]}
        size={size}
        color={color}
        {...(accessibilityLabel ? { accessibilityLabel } : {})}
      />
    </Host>
  );
}
