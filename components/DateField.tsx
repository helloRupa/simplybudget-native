import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { toISODate } from "@/utils/dates";
import { useBudget } from "@/context/BudgetContext";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/typography";

interface DateFieldProps {
  label: string;
  value: string; // ISO YYYY-MM-DD, or "" for unset
  onChange: (date: string) => void;
  minimumDate?: Date;
  error?: string;
  placeholder?: string;
}

export default function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
  placeholder,
}: DateFieldProps) {
  const { t } = useBudget();
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? parseISO(value) : new Date();

  const handleChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(toISODate(selectedDate));
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setShowPicker(true)}
        accessibilityLabel={label}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || placeholder || ""}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Android: native dialog */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}

      {/* iOS: spinner in a modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.iosBackdrop}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <Pressable
                  onPress={() => setShowPicker(false)}
                  accessibilityLabel={t("done")}
                  accessibilityRole="button"
                >
                  <Text style={styles.iosDone}>{t("done")}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                themeVariant="dark"
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  triggerError: {
    borderColor: colors.toastError,
  },
  triggerText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.regular,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: {
    color: colors.dangerText,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  iosBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  iosSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  iosHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosDone: {
    color: colors.teal,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  iosPicker: {
    height: 200,
  },
});
