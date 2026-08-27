import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { AppIcon } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function TabsLayout() {
  const { tokens } = useTheme();
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
          borderTopWidth: StyleSheet.hairlineWidth,
          borderRightColor: tokens.colors.border,
          borderRightWidth: expanded ? StyleSheet.hairlineWidth : 0,
          width: expanded ? 92 : undefined,
          height: expanded ? undefined : 64,
          paddingBottom: expanded ? 12 : 6,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          minHeight: expanded ? 64 : 44,
          paddingVertical: expanded ? 6 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <AppIcon name="home" size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Purchases",
          tabBarIcon: ({ color }) => (
            <AppIcon name="purchases" size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color }) => (
            <AppIcon name="reminders" size={23} color={color} />
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
            <AppIcon name="account" size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
