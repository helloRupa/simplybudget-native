import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";
import * as sharedStyles from "@/constants/sharedStyles";

export interface PickerOption {
  label: string;
  value: string;
}

interface FieldPickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function FieldPicker({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
}: FieldPickerProps) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setVisible(true)}
        accessibilityLabel={label}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder ?? ""}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.option,
                    value === opt.value && styles.optionActive,
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === opt.value && styles.optionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {value === opt.value && (
                    <Ionicons name="checkmark" size={16} color={colors.teal} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...sharedStyles.formLabel },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  triggerError: {
    borderColor: colors.toastError,
  },
  triggerText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontFamily: fonts.regular,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: { ...sharedStyles.inlineError },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: "100%",
    maxHeight: 400,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sheetTitle: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.tealSubtle,
  },
  optionText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontFamily: fonts.regular,
  },
  optionTextActive: {
    color: colors.teal,
    fontFamily: fonts.semiBold,
  },
});
