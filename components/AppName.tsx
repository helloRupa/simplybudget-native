import { StyleSheet, Text, View } from "react-native";

interface AppNameProps {
  size?: "large" | "small";
}

export default function AppName({ size = "large" }: AppNameProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.text, size === "small" ? styles.small : styles.large]}>
        <Text style={styles.white}>Simply</Text>
        <Text style={styles.teal}>Budget</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  text: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  large: {
    fontSize: 24,
  },
  small: {
    fontSize: 18,
  },
  white: {
    color: "#ffffff",
  },
  teal: {
    color: "#2dd4bf",
  },
});
