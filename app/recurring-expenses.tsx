import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBudget } from "@/context/BudgetContext";
import { RecurringExpense } from "@/types";
import Toast from "@/components/Toast";
import RecurringExpenseForm, {
  DAY_KEYS,
  MONTH_KEYS,
} from "@/components/RecurringExpenseForm";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";

interface ToastState {
  message: string;
  type: "success" | "error";
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function RecurringExpensesScreen() {
  const { state, deleteRecurringExpense, t, tc, fc } = useBudget();
  const insets = useSafeAreaInsets();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function startEdit(re: RecurringExpense) {
    setEditingExpense(re);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingExpense(null);
  }

  function handleSave(wasEditing: boolean) {
    setToast({
      message: wasEditing
        ? t("recurringExpenseUpdated")
        : t("recurringExpenseAdded"),
      type: "success",
    });
    closeForm();
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
            accessibilityLabel={t("addRecurringExpense")}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>{t("addRecurringExpense")}</Text>
          </Pressable>
        )}

        {/* Form */}
        {showForm && (
          <RecurringExpenseForm
            key={editingExpense?.id ?? "new"}
            editingExpense={editingExpense}
            onSave={handleSave}
            onCancel={closeForm}
          />
        )}

        {/* List */}
        {!showForm && (
          <FlatList
            data={state.recurringExpenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            initialNumToRender={10}
            removeClippedSubviews
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("noRecurringExpenses")}</Text>
            }
            renderItem={({ item: re }) => {
              const isExpired = !!re.endDate && re.endDate < TODAY;
              return (
              <View style={[styles.card, isExpired && styles.cardExpired]}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardAmount}>{fc(re.amount)}</Text>
                    <Text style={styles.cardFrequency}>
                      {frequencyLabel(re)}
                    </Text>
                    {isExpired && (
                      <View style={styles.expiredBadge}>
                        <Text style={styles.expiredBadgeText}>
                          {t("expired")}
                        </Text>
                      </View>
                    )}
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
                      <Pressable
                        onPress={() => startEdit(re)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.editText}>{t("edit")}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setDeletingId(re.id)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.deleteText}>{t("delete")}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );}}
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
    borderRadius: radius.lg,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  addButtonText: {
    color: colors.background,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardExpired: {
    backgroundColor: colors.surfaceDim,
  },
  expiredBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSubtle,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  expiredBadgeText: {
    color: colors.dangerText,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    fontVariant: ["tabular-nums"],
  },
  cardFrequency: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  cardCategory: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  editText: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: colors.dangerText,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteConfirmButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSubtle,
  },
  deleteConfirmText: {
    color: colors.dangerText,
    fontSize: fontSize.base,
    fontFamily: fonts.semiBold,
  },
  cancelSmallButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelSmallText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
});
