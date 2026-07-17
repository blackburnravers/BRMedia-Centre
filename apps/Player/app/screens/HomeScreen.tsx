import React from "react";
import { View, Text } from "react-native";

/**
 * Player Home Screen
 * Placeholder for library + now playing UI
 */
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Player Home
      </Text>

      <Text style={{ marginTop: 8 }}>
        Library + Now Playing coming soon.
      </Text>
    </View>
  );
}