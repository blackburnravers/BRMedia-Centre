import React from "react";
import { View, Text } from "react-native";

/**
 * Mastering Settings Screen
 * Will control:
 * - mastering profiles
 * - preview generation rules
 * - theme (light/dark)
 */
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Mastering Settings
      </Text>

      <Text style={{ marginTop: 8 }}>
        Settings panel placeholder.
      </Text>
    </View>
  );
}