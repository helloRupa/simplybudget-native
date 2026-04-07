import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";

export default function ExpenseFormScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Expense Form</Text>
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
