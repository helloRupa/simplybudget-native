import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/typography";

interface AppNameProps {
  size?: "large" | "small";
}

export default function AppName({ size = "large" }: AppNameProps) {
  return (
    <View style={styles.row}>
      <Text testID="appname-text" style={[styles.text, size === "small" ? styles.small : styles.large]}>
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
    fontFamily: fonts.extraBold,
    letterSpacing: -0.5,
  },
  large: {
    fontSize: 24,
  },
  small: {
    fontSize: 18,
  },
  white: {
    color: colors.white,
  },
  teal: {
    color: colors.teal,
  },
});
