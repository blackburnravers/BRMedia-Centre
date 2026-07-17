import React from "react";
import { View, Text } from "react-native";

/**
 * Tagger Home Screen
 * Placeholder for library + batch tagging UI
 */
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        Tagger Home
      </Text>

      <Text style={{ marginTop: 8 }}>
        Tagging workspace coming soon.
      </Text>
    </View>
  );
}