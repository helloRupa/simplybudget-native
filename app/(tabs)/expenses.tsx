import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";

export default function ExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Expenses</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: colors.white,
    fontSize: 18,
  },
});
