import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBudget } from "@/context/BudgetContext";
import { LOCALE_NAMES, LocaleKey } from "@/i18n/locales";
import AppName from "./AppName";
import { colors } from "@/constants/colors";

export default function Header() {
  const { state, setLocale } = useBudget();
  const [localePickerVisible, setLocalePickerVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Logo + name */}
      <View style={styles.left}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <AppName size="small" />
      </View>

      {/* Locale picker trigger */}
      <Pressable
        style={styles.localeTrigger}
        onPress={() => setLocalePickerVisible(true)}
        accessibilityLabel="Select language"
      >
        <Text style={styles.localeText}>
          {LOCALE_NAMES[state.locale]}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
      </Pressable>

      {/* Locale picker modal */}
      <Modal
        visible={localePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocalePickerVisible(false)}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setLocalePickerVisible(false)}
        >
          <View style={styles.pickerCard}>
            {(Object.entries(LOCALE_NAMES) as [LocaleKey, string][]).map(
              ([key, name]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.pickerOption,
                    state.locale === key && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setLocale(key);
                    setLocalePickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      state.locale === key && styles.pickerOptionTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                  {state.locale === key && (
                    <Ionicons name="checkmark" size={16} color={colors.teal} />
                  )}
                </Pressable>
              )
            )}
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  localeTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localeText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: colors.tealSubtle,
  },
  pickerOptionText: {
    color: colors.white,
    fontSize: 15,
  },
  pickerOptionTextActive: {
    color: colors.teal,
    fontWeight: "600",
  },
});
