import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBudget } from "@/context/BudgetContext";
import { DEFAULT_CATEGORY_NAMES, SUPPORTED_CURRENCIES, CurrencyCode } from "@/utils/constants";
import { LOCALE_NAMES, LocaleKey } from "@/i18n/locales";
import { exportBackup, pickAndParseBackup } from "@/utils/backup";
import { exportToCSV } from "@/utils/csv";
import FieldPicker, { PickerOption } from "@/components/FieldPicker";
import AboutModal from "@/components/AboutModal";
import Toast from "@/components/Toast";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/typography";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    state,
    setWeeklyBudget,
    addCategory,
    deleteCategory,
    setCurrency,
    setLocale,
    importData,
    t,
    tc,
    fc,
    currencySymbol,
  } = useBudget();

  const [budgetInput, setBudgetInput] = useState(state.weeklyBudget.toString());
  const [budgetError, setBudgetError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const currencyOptions: PickerOption[] = Object.entries(SUPPORTED_CURRENCIES).map(
    ([code, label]) => ({ value: code, label })
  );

  const localeOptions: PickerOption[] = (Object.entries(LOCALE_NAMES) as [LocaleKey, string][]).map(
    ([key, name]) => ({ value: key, label: name })
  );

  const isDefaultCategory = (cat: string) =>
    (DEFAULT_CATEGORY_NAMES as readonly string[]).includes(cat);

  function handleSaveBudget() {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      setBudgetError(t("budgetPositive"));
      return;
    }
    setBudgetError("");
    setWeeklyBudget(Math.round(amount * 100) / 100);
    setToast({ message: t("budgetUpdated"), type: "success" });
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) {
      setToast({ message: t("categoryTooLong"), type: "error" });
      return;
    }
    const success = addCategory(trimmed);
    if (success) {
      setNewCategory("");
      setToast({ message: t("categoryAdded"), type: "success" });
    } else {
      setToast({ message: t("categoryExists"), type: "error" });
    }
  }

  async function handleExportCSV() {
    if (state.expenses.length === 0) {
      setToast({ message: t("noExpenses"), type: "error" });
      return;
    }
    try {
      await exportToCSV(state.expenses, t as (key: string) => string, tc, (d) => d);
      setToast({ message: t("csvExported"), type: "success" });
    } catch {
      setToast({ message: t("backupImportFailed"), type: "error" });
    }
  }

  async function handleExportBackup() {
    try {
      await exportBackup(state);
      setToast({ message: t("backupExported"), type: "success" });
    } catch {
      setToast({ message: t("backupImportFailed"), type: "error" });
    }
  }

  function handleImportBackup() {
    Alert.alert(
      t("importBackup"),
      t("importConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("importBackup"),
          style: "destructive",
          onPress: async () => {
            try {
              const data = await pickAndParseBackup();
              importData(data);
              setBudgetInput(data.weeklyBudget.toString());
              setToast({ message: t("backupImported"), type: "success" });
            } catch (err) {
              if (err instanceof Error && err.message !== "cancelled") {
                setToast({ message: t("backupImportFailed"), type: "error" });
              }
            }
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Weekly Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("setBudget")}</Text>
          <View style={styles.budgetRow}>
            <View style={styles.budgetInputWrapper}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={[styles.budgetInput, budgetError ? styles.inputError : null]}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="decimal-pad"
                placeholder={t("budgetAmount")}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSaveBudget}
              />
            </View>
            <Pressable
              style={styles.saveButton}
              onPress={handleSaveBudget}
              accessibilityLabel={t("save")}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>{t("save")}</Text>
            </Pressable>
          </View>
          {budgetError ? (
            <Text style={styles.error}>{budgetError}</Text>
          ) : null}
          <Text style={styles.hint}>
            {t("weeklyBudget")}: {fc(state.weeklyBudget)}
          </Text>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("currency")}</Text>
          <FieldPicker
            label=""
            value={state.currency}
            options={currencyOptions}
            onChange={(v) => setCurrency(v as CurrencyCode)}
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("language")}</Text>
          <FieldPicker
            label=""
            value={state.locale}
            options={localeOptions}
            onChange={(v) => setLocale(v as LocaleKey)}
          />
        </View>

        {/* Recurring Expenses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("recurringExpenses")}</Text>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/recurring-expenses")}
          >
            <Text style={styles.navRowText}>{t("recurringExpenses")}</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {/* Category Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("manageCategories")}</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.categoryInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder={t("newCategoryPlaceholder")}
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleAddCategory}
            />
            <Pressable
              style={styles.addButton}
              onPress={handleAddCategory}
              accessibilityLabel={t("addCategory")}
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>{t("addCategory")}</Text>
            </Pressable>
          </View>
          <View style={styles.categoryChips}>
            {state.categories.map((cat) => (
              <View key={cat.name} style={styles.chip}>
                <View
                  style={[styles.chipDot, { backgroundColor: cat.color }]}
                />
                <Text style={styles.chipText}>{tc(cat.name)}</Text>
                {!isDefaultCategory(cat.name) && (
                  <Pressable
                    onPress={() => deleteCategory(cat.name)}
                    hitSlop={8}
                    accessibilityLabel={t("deleteCategory")}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={colors.dangerText}
                    />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Export & Import */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("exportData")}</Text>
          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.exportButton}
              onPress={handleExportCSV}
              accessibilityLabel={t("exportCSV")}
              accessibilityRole="button"
            >
              <Ionicons name="document-text-outline" size={16} color={colors.background} />
              <Text style={styles.exportButtonText}>{t("exportCSV")}</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.exportButtonIndigo]}
              onPress={handleExportBackup}
              accessibilityLabel={t("exportBackup")}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-download-outline" size={16} color={colors.white} />
              <Text style={[styles.exportButtonText, styles.exportTextWhite]}>
                {t("exportBackup")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.exportButtonAmber]}
              onPress={handleImportBackup}
              accessibilityLabel={t("importBackup")}
              accessibilityRole="button"
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.background} />
              <Text style={styles.exportButtonText}>{t("importBackup")}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {state.expenses.length} {t("expenses").toLowerCase()}
          </Text>
        </View>

        {/* About */}
        <Pressable
          style={styles.aboutRow}
          onPress={() => setIsAboutVisible(true)}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.teal}
          />
          <Text style={styles.aboutText}>{t("about")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </ScrollView>

      <AboutModal
        visible={isAboutVisible}
        onClose={() => setIsAboutVisible(false)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  // Budget
  budgetRow: {
    flexDirection: "row",
    gap: 10,
  },
  budgetInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    color: colors.amber,
    fontSize: 15,
    fontFamily: fonts.regular,
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.regular,
    paddingVertical: 11,
  },
  inputError: {
    borderColor: colors.toastError,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.teal,
    justifyContent: "center",
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  error: {
    color: colors.dangerText,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: -4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  // Nav row (recurring expenses)
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  navRowText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  // Categories
  addRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.teal,
    justifyContent: "center",
  },
  addButtonText: {
    color: colors.background,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  // Export buttons
  buttonGroup: {
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.teal,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  exportButtonIndigo: {
    backgroundColor: colors.indigo,
  },
  exportButtonAmber: {
    backgroundColor: colors.amber,
  },
  exportButtonText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  exportTextWhite: {
    color: colors.white,
  },
  // About
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    padding: 16,
  },
  aboutText: {
    color: colors.teal,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
});
