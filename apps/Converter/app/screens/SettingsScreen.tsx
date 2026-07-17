import React from "react";
import { View, Text } from "react-native";

/**
 * Converter Settings Screen
 * Will control:
 * - default formats
 * - output paths
 * - spectrum colours
 * - theme (light/dark)
 */
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Converter Settings
      </Text>

      <Text style={{ marginTop: 8 }}>
        Settings panel placeholder.
      </Text>
    </View>
  );
}