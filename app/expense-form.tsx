import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBudget } from "@/context/BudgetContext";
import { toISODate } from "@/utils/dates";
import { parseISO } from "date-fns";
import FieldPicker from "@/components/FieldPicker";
import DateField from "@/components/DateField";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";
import * as sharedStyles from "@/constants/sharedStyles";

export default function ExpenseFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addExpense, updateExpense, t, tc, currencySymbol } =
    useBudget();
  const insets = useSafeAreaInsets();

  const editingExpense = id
    ? state.expenses.find((e) => e.id === id) ?? null
    : null;

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setDate(editingExpense.date);
    }
  }, [editingExpense]);

  const categoryOptions = state.categories.map((cat) => ({
    label: tc(cat.name),
    value: cat.name,
  }));

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const parsed = parseFloat(amount);

    if (!amount || isNaN(parsed) || parsed === 0) {
      newErrors.amount = t("amountNonZero");
    }
    if (!category) {
      newErrors.category = t("categoryRequired");
    }
    if (!date) {
      newErrors.date = t("dateRequired");
    } else if (date < state.firstUseDate) {
      newErrors.date = t("dateBeforeStart");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      });
    } else {
      addExpense({
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      });
    }

    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("amount")}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <TextInput
              style={[
                styles.amountInput,
                errors.amount ? styles.inputError : null,
              ]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          {errors.amount ? (
            <Text style={styles.error}>{errors.amount}</Text>
          ) : null}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <FieldPicker
            label={t("category")}
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            placeholder={t("selectCategory")}
            error={errors.category}
          />
        </View>

        {/* Date */}
        <View style={styles.field}>
          <DateField
            label={t("date")}
            value={date}
            onChange={setDate}
            minimumDate={
              state.firstUseDate ? parseISO(state.firstUseDate) : undefined
            }
            error={errors.date}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("description")}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t("descriptionPlaceholder")}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {editingExpense && (
            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              accessibilityLabel={t("cancel")}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.submitButton}
            onPress={handleSubmit}
            accessibilityLabel={editingExpense ? t("update") : t("addExpense")}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>
              {editingExpense ? t("update") : t("addExpense")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 16,
    gap: 16,
  },
  field: {
    gap: 0,
  },
  label: { ...sharedStyles.formLabel },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    color: colors.amber,
    fontSize: fontSize.xxl,
    fontFamily: fonts.semiBold,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.xl,
    fontFamily: fonts.regular,
    paddingVertical: 11,
  },
  input: { ...sharedStyles.textInput },
  inputError: {
    borderColor: colors.toastError,
  },
  error: { ...sharedStyles.inlineError },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontFamily: fonts.semiBold,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  submitText: {
    color: colors.background,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
});
