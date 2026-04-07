import { StyleSheet, Text, View } from "react-native";

export default function RecurringExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Recurring Expenses</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
});
