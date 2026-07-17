import React from "react";
import { SafeAreaView, Text, View } from "react-native";

/**
 * Root App component for BRMedia Mastering
 * (Scaffold placeholder — navigation comes later)
 */
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          BRMedia Mastering
        </Text>
        <Text style={{ marginTop: 8 }}>
          App scaffold initialised.
        </Text>
      </View>
    </SafeAreaView>
  );
}