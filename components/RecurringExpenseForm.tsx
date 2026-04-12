import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBudget } from "@/context/BudgetContext";
import { RecurringExpense, RecurringFrequency } from "@/types";
import { toISODate } from "@/utils/dates";
import { addDays, parseISO } from "date-fns";
import { TranslationKey } from "@/i18n/locales";
import FieldPicker, { PickerOption } from "@/components/FieldPicker";
import DateField from "@/components/DateField";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/typography";

export const DAY_KEYS: TranslationKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const MONTH_KEYS: TranslationKey[] = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

interface Props {
  editingExpense: RecurringExpense | null;
  onSave: (wasEditing: boolean) => void;
  onCancel: () => void;
}

export default function RecurringExpenseForm({
  editingExpense,
  onSave,
  onCancel,
}: Props) {
  const { state, addRecurringExpense, updateRecurringExpense, t, tc } =
    useBudget();
  const insets = useSafeAreaInsets();

  const firstUseDateObj = parseISO(state.firstUseDate);

  const [amount, setAmount] = useState(
    editingExpense?.amount.toString() ?? ""
  );
  const [category, setCategory] = useState(editingExpense?.category ?? "");
  const [description, setDescription] = useState(
    editingExpense?.description ?? ""
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    editingExpense?.frequency ?? "monthly"
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    editingExpense?.dayOfMonth.toString() ?? "1"
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    String(editingExpense?.dayOfWeek ?? 1)
  );
  const [monthOfYear, setMonthOfYear] = useState(
    String(editingExpense?.monthOfYear ?? 0)
  );
  const [startDate, setStartDate] = useState(
    editingExpense?.startDate ?? toISODate(new Date())
  );
  const [endDate, setEndDate] = useState(editingExpense?.endDate ?? "");

  const tomorrow = addDays(new Date(), 1);
  const minEndDate = startDate
    ? new Date(Math.max(tomorrow.getTime(), addDays(parseISO(startDate), 1).getTime()))
    : tomorrow;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryOptions: PickerOption[] = state.categories.map((cat) => ({
    label: tc(cat.name),
    value: cat.name,
  }));

  const frequencyOptions: PickerOption[] = [
    { label: t("weekly"), value: "weekly" },
    { label: t("monthly"), value: "monthly" },
    { label: t("annually"), value: "annually" },
  ];

  const dayOfWeekOptions: PickerOption[] = DAY_KEYS.map((key, i) => ({
    label: t(key),
    value: String(i),
  }));

  const dayOfMonthOptions: PickerOption[] = Array.from(
    { length: 31 },
    (_, i) => ({ label: String(i + 1), value: String(i + 1) })
  );

  const monthOptions: PickerOption[] = MONTH_KEYS.map((key, i) => ({
    label: t(key),
    value: String(i),
  }));

  function handleSubmit() {
    const newErrors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = t("amountPositive");
    }
    if (!category) {
      newErrors.category = t("categoryRequired");
    }
    if (!startDate) {
      newErrors.startDate = t("dateRequired");
    }
    if (endDate) {
      const today = toISODate(new Date());
      if (endDate <= today) {
        newErrors.endDate = t("endDatePast");
      } else if (startDate && endDate <= startDate) {
        newErrors.endDate = t("endDateBeforeStart");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data = {
      amount: Math.round(parsedAmount * 100) / 100,
      category,
      description: description.trim(),
      frequency,
      dayOfMonth: parseInt(dayOfMonth),
      dayOfWeek: parseInt(dayOfWeek),
      monthOfYear: parseInt(monthOfYear),
      startDate,
      endDate: endDate || null,
    };

    if (editingExpense) {
      updateRecurringExpense({ ...editingExpense, ...data });
      onSave(true);
    } else {
      addRecurringExpense(data);
      onSave(false);
    }
  }

  return (
    <ScrollView
      style={styles.formScroll}
      contentContainerStyle={[
        styles.formContent,
        { paddingBottom: insets.bottom + 16 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.formTitle}>
        {editingExpense ? t("editRecurringExpense") : t("addRecurringExpense")}
      </Text>

      {/* Amount */}
      <View>
        <Text style={styles.fieldLabel}>{t("amount")}</Text>
        <TextInput
          style={[styles.input, errors.amount ? styles.inputError : null]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        {errors.amount ? (
          <Text style={styles.error}>{errors.amount}</Text>
        ) : null}
      </View>

      {/* Category */}
      <FieldPicker
        label={t("category")}
        value={category}
        options={categoryOptions}
        onChange={setCategory}
        placeholder={t("selectCategory")}
        error={errors.category}
      />

      {/* Description */}
      <View>
        <Text style={styles.fieldLabel}>{t("description")}</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={t("descriptionPlaceholder")}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Frequency */}
      <FieldPicker
        label={t("frequency")}
        value={frequency}
        options={frequencyOptions}
        onChange={(v) => setFrequency(v as RecurringFrequency)}
      />

      {/* Weekly: day of week */}
      {frequency === "weekly" && (
        <FieldPicker
          label={t("dayOfWeek")}
          value={dayOfWeek}
          options={dayOfWeekOptions}
          onChange={setDayOfWeek}
        />
      )}

      {/* Monthly: day of month */}
      {frequency === "monthly" && (
        <FieldPicker
          label={t("dayOfMonth")}
          value={dayOfMonth}
          options={dayOfMonthOptions}
          onChange={setDayOfMonth}
        />
      )}

      {/* Annually: month + day */}
      {frequency === "annually" && (
        <>
          <FieldPicker
            label={t("monthOfYear")}
            value={monthOfYear}
            options={monthOptions}
            onChange={setMonthOfYear}
          />
          <FieldPicker
            label={t("dayOfMonth")}
            value={dayOfMonth}
            options={dayOfMonthOptions}
            onChange={setDayOfMonth}
          />
        </>
      )}

      {/* Start date */}
      <DateField
        label={t("startDate")}
        value={startDate}
        onChange={setStartDate}
        minimumDate={firstUseDateObj}
        error={errors.startDate}
      />

      {/* End date */}
      <View>
        <DateField
          label={t("endDate")}
          value={endDate}
          onChange={setEndDate}
          minimumDate={minEndDate}
          placeholder={t("noEndDate")}
          error={errors.endDate}
        />
        {endDate ? (
          <Pressable
            style={styles.clearDateButton}
            onPress={() => setEndDate("")}
            accessibilityRole="button"
          >
            <Text style={styles.clearDateText}>{t("clearEndDate")}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityLabel={t("cancel")}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>{t("cancel")}</Text>
        </Pressable>
        <Pressable
          style={styles.submitButton}
          onPress={handleSubmit}
          accessibilityLabel={editingExpense ? t("update") : t("save")}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>
            {editingExpense ? t("update") : t("save")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    gap: 16,
  },
  formTitle: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  inputError: {
    borderColor: colors.toastError,
  },
  error: {
    color: colors.dangerText,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  clearDateButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.dangerSubtle,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  clearDateText: {
    color: colors.dangerText,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  submitText: {
    color: colors.background,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
