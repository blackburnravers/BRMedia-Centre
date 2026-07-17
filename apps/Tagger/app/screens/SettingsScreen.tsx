import React from "react";
import { View, Text } from "react-native";

/**
 * Tagger Settings Screen
 * Will control:
 * - default tag templates
 * - batch rules
 * - artwork handling
 * - theme (light/dark)
 */
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Tagger Settings
      </Text>

      <Text style={{ marginTop: 8 }}>
        Settings panel placeholder.
      </Text>
    </View>
  );
}