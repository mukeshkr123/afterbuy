import { Tabs } from "expo-router";
import React from "react";
import { useWindowDimensions } from "react-native";
import { AppIcon } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const { tokens, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const expanded = width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.accent,
        tabBarInactiveTintColor: tokens.colors.textSubtle,
        tabBarPosition: expanded ? "left" : "bottom",
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
          borderRightColor: tokens.colors.border,
          width: expanded ? 88 : undefined,
          height: expanded ? undefined : 68,
          paddingBottom: expanded ? 12 : 8,
          paddingTop: 8,
          // The upward shadow only reads on a light canvas; in dark the border
          // separates the bar instead.
          ...(isDark
            ? { elevation: 0 }
            : {
                elevation: 8,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
              }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          minHeight: expanded ? 64 : 48,
          paddingVertical: expanded ? 6 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <AppIcon name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Purchases",
          tabBarIcon: ({ color }) => (
            <AppIcon name="purchases" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color }) => (
            <AppIcon name="reminders" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null, // Hide raw search from bottom bar to match 4-tab bar
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <AppIcon name="account" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
