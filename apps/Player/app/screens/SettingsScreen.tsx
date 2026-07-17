import React from "react";
import { View, Text } from "react-native";

/**
 * Player Settings Screen
 * Will control:
 * - seek/rewind behaviour
 * - streaming mode (server-first)
 * - cache rules (future)
 * - theme (light/dark)
 */
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Player Settings
      </Text>

      <Text style={{ marginTop: 8 }}>
        Settings panel placeholder.
      </Text>
    </View>
  );
}