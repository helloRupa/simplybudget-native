import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useBudget } from "@/context/BudgetContext";
import { RecurringExpense, RecurringFrequency } from "@/types";
import { toISODate } from "@/utils/dates";
import { parseISO } from "date-fns";
import { TranslationKey } from "@/i18n/locales";
import FieldPicker, { PickerOption } from "@/components/FieldPicker";
import DateField from "@/components/DateField";
import Toast from "@/components/Toast";
import { colors } from "@/constants/colors";

const DAY_KEYS: TranslationKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTH_KEYS: TranslationKey[] = [
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

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function RecurringExpensesScreen() {
  const {
    state,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    t,
    tc,
    fc,
  } = useBudget();

  const firstUseDateObj = parseISO(state.firstUseDate);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("0");
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState("");
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

  function resetForm() {
    setAmount("");
    setCategory("");
    setDescription("");
    setFrequency("monthly");
    setDayOfMonth("1");
    setDayOfWeek("1");
    setMonthOfYear("0");
    setStartDate(toISODate(new Date()));
    setEndDate("");
    setErrors({});
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(re: RecurringExpense) {
    setAmount(re.amount.toString());
    setCategory(re.category);
    setDescription(re.description);
    setFrequency(re.frequency);
    setDayOfMonth(re.dayOfMonth.toString());
    setDayOfWeek(String(re.dayOfWeek ?? 1));
    setMonthOfYear(String(re.monthOfYear ?? 0));
    setStartDate(re.startDate);
    setEndDate(re.endDate ?? "");
    setEditingId(re.id);
    setShowForm(true);
    setErrors({});
  }

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

    if (editingId) {
      const existing = state.recurringExpenses.find((r) => r.id === editingId);
      if (existing) {
        updateRecurringExpense({ ...existing, ...data });
        setToast({ message: t("recurringExpenseUpdated"), type: "success" });
      }
    } else {
      addRecurringExpense(data);
      setToast({ message: t("recurringExpenseAdded"), type: "success" });
    }

    resetForm();
  }

  function confirmDelete(id: string) {
    deleteRecurringExpense(id);
    setDeletingId(null);
    setToast({ message: t("recurringExpenseDeleted"), type: "success" });
  }

  function frequencyLabel(re: RecurringExpense): string {
    switch (re.frequency) {
      case "weekly":
        return `${t("weekly")}, ${t("everyWeek")} ${t(DAY_KEYS[re.dayOfWeek ?? 0])}`;
      case "annually":
        return `${t("annually")}, ${t(MONTH_KEYS[re.monthOfYear ?? 0])} ${re.dayOfMonth}`;
      case "monthly":
      default:
        return `${t("monthly")}, ${t("onDay")} ${re.dayOfMonth}`;
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Add button */}
        {!showForm && (
          <Pressable
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addButtonText}>{t("addRecurringExpense")}</Text>
          </Pressable>
        )}

        {/* Form */}
        {showForm && (
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.formTitle}>
              {editingId
                ? t("editRecurringExpense")
                : t("addRecurringExpense")}
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
                minimumDate={firstUseDateObj}
                placeholder={t("noEndDate")}
              />
              {endDate ? (
                <Pressable onPress={() => setEndDate("")}>
                  <Text style={styles.clearDate}>{t("noEndDate")}</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>
                  {editingId ? t("update") : t("save")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* List */}
        {!showForm && (
          <FlatList
            data={state.recurringExpenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("noRecurringExpenses")}</Text>
            }
            renderItem={({ item: re }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardAmount}>{fc(re.amount)}</Text>
                    <Text style={styles.cardFrequency}>{frequencyLabel(re)}</Text>
                  </View>
                  <Text style={styles.cardDescription}>
                    {re.description || tc(re.category)}
                  </Text>
                  <Text style={styles.cardCategory}>{tc(re.category)}</Text>
                </View>

                <View style={styles.cardActions}>
                  {deletingId === re.id ? (
                    <>
                      <Pressable
                        style={styles.deleteConfirmButton}
                        onPress={() => confirmDelete(re.id)}
                      >
                        <Text style={styles.deleteConfirmText}>
                          {t("delete")}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.cancelSmallButton}
                        onPress={() => setDeletingId(null)}
                      >
                        <Text style={styles.cancelSmallText}>
                          {t("cancel")}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => startEdit(re)}>
                        <Text style={styles.editText}>{t("edit")}</Text>
                      </Pressable>
                      <Pressable onPress={() => setDeletingId(re.id)}>
                        <Text style={styles.deleteText}>{t("delete")}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            )}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </View>
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
  addButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  addButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
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
    fontWeight: "700",
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
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
  },
  inputError: {
    borderColor: colors.toastError,
  },
  error: {
    color: colors.dangerText,
    fontSize: 12,
    marginTop: 4,
  },
  clearDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
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
    fontWeight: "600",
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
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardAmount: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: "700",
  },
  cardFrequency: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  cardCategory: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  editText: {
    color: colors.teal,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: colors.dangerText,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteConfirmButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.dangerSubtle,
  },
  deleteConfirmText: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: "600",
  },
  cancelSmallButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelSmallText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
