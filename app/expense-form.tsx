import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
});
