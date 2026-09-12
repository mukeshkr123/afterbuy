import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

function TabLabelWithDot({
  label,
  focused,
  color,
}: {
  label: string;
  focused: boolean;
  color: any;
}) {
  const colorStr = typeof color === "string" ? color : String(color);
  return (
    <View style={styles.labelContainer}>
      <Text
        style={[
          styles.labelText,
          {
            color: colorStr,
            fontWeight: focused ? "700" : "600",
          },
        ]}
      >
        {label}
      </Text>
      {focused ? (
        <View style={[styles.indicatorDot, { backgroundColor: colorStr }]} />
      ) : (
        <View style={styles.indicatorSpacer} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const expanded = width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5B4DF5",
        tabBarInactiveTintColor: "#64748B",
        tabBarPosition: expanded ? "left" : "bottom",
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F1F5F9",
          borderTopWidth: 1,
          borderRightColor: "#F1F5F9",
          borderRightWidth: expanded ? 1 : 0,
          width: expanded ? 92 : undefined,
          height: expanded ? undefined : 64,
          paddingBottom: expanded ? 12 : 4,
          paddingTop: 6,
          elevation: 0,
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabelWithDot label="Home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Purchases",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={22}
              color={color}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabelWithDot
              label="Purchases"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={22}
              color={color}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabelWithDot
              label="Reminders"
              color={color}
              focused={focused}
            />
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabelWithDot label="Account" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  labelText: {
    fontSize: 11,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  indicatorSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
