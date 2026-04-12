import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import { useBudget } from "@/context/BudgetContext";
import { Expense, FilterState, SortState } from "@/types";
import { isInRange, toISODate } from "@/utils/dates";
import ExpenseFilters from "@/components/ExpenseFilters";
import Toast from "@/components/Toast";
import { colors } from "@/constants/colors";
import { fonts, fontSize } from "@/constants/typography";

const TODAY = toISODate(new Date());

function getDefaultFilters(): FilterState {
  return {
    dateFrom: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    category: "",
    searchQuery: "",
  };
}

function CategoryBadge({ category }: { category: string }) {
  const { state, tc } = useBudget();
  const cat = state.categories.find((c) => c.name === category);
  const color = cat?.color ?? colors.textMuted;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "33", borderColor: color + "55" },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{tc(category)}</Text>
    </View>
  );
}

interface ExpenseCardProps {
  expense: Expense;
  deletingId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

function ExpenseCard({
  expense,
  deletingId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: ExpenseCardProps) {
  const { t, fc, fd } = useBudget();
  const isDeleting = deletingId === expense.id;
  const isFuture = expense.date > TODAY;

  return (
    <View style={[styles.card, isFuture && styles.cardFuture]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.badgeRow}>
            <CategoryBadge category={expense.category} />
            {expense.recurringExpenseId && (
              <Ionicons
                name="repeat-outline"
                size={14}
                color={colors.teal}
                style={styles.recurringIcon}
              />
            )}
            {isFuture && (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>{t("upcoming")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDate}>{fd(expense.date)}</Text>
        </View>
        <Text
          style={[
            styles.cardAmount,
            expense.amount < 0 ? styles.amountPositive : styles.amountNormal,
          ]}
        >
          {fc(expense.amount)}
        </Text>
      </View>

      {expense.description ? (
        <Text style={styles.cardDescription}>{expense.description}</Text>
      ) : null}

      <View style={styles.cardActions}>
        {isDeleting ? (
          <>
            <Pressable
              style={styles.deleteConfirmButton}
              onPress={() => onConfirmDelete(expense.id)}
            >
              <Text style={styles.deleteConfirmText}>{t("delete")}</Text>
            </Pressable>
            <Pressable
              style={styles.cancelSmallButton}
              onPress={onCancelDelete}
            >
              <Text style={styles.cancelSmallText}>{t("cancel")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.editButton} onPress={() => onEdit(expense)}>
              <Text style={styles.editText}>{t("edit")}</Text>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              onPress={() => onDelete(expense.id)}
            >
              <Text style={styles.deleteText}>{t("delete")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { state, deleteExpense, t, tc } = useBudget();
  const [defaultFilters] = useState(getDefaultFilters);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortState>({
    field: "date",
    direction: "desc",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const filteredExpenses = useMemo(() => {
    const result = state.expenses.filter((expense) => {
      if (filters.category && expense.category !== filters.category)
        return false;
      if (!isInRange(expense.date, filters.dateFrom, filters.dateTo))
        return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          expense.description.toLowerCase().includes(q) ||
          tc(expense.category).toLowerCase().includes(q) ||
          expense.amount.toString().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sort.direction === "desc" ? -cmp : cmp;
    });

    return result;
  }, [state.expenses, filters, sort, tc]);

  function handleSort(field: SortState["field"]) {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  }

  function confirmDelete(id: string) {
    deleteExpense(id);
    setDeletingId(null);
    setToast({ message: t("expenseDeleted"), type: "success" });
  }

  const sortIndicator = (field: SortState["field"]) => {
    if (sort.field !== field) return " ↕";
    return sort.direction === "desc" ? " ↓" : " ↑";
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <ExpenseFilters
              filters={filters}
              defaultFilters={defaultFilters}
              onFilterChange={setFilters}
            />
            <View style={styles.sortBar}>
              {(["date", "category", "amount"] as SortState["field"][]).map(
                (field) => (
                  <Pressable
                    key={field}
                    style={styles.sortButton}
                    onPress={() => handleSort(field)}
                  >
                    <Text style={styles.sortText}>
                      {t(field as "date" | "category" | "amount")}
                      {sortIndicator(field)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>{t("noExpenses")}</Text>
          </View>
        }
        ListFooterComponent={
          filteredExpenses.length > 0 ? (
            <Text style={styles.countText}>
              {filteredExpenses.length} {t("expenses").toLowerCase()}
              {filteredExpenses.length !== state.expenses.length &&
                ` ${t("of")} ${state.expenses.length}`}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            deletingId={deletingId}
            onEdit={(expense) =>
              router.push({
                pathname: "/expense-form",
                params: { id: expense.id },
              })
            }
            onDelete={setDeletingId}
            onConfirmDelete={confirmDelete}
            onCancelDelete={() => setDeletingId(null)}
          />
        )}
      />

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/expense-form")}
        accessibilityLabel={t("addExpense")}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </Pressable>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 88,
  },
  sortBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  sortButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sortText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: fonts.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
    fontFamily: fonts.regular,
  },
  countText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: "center",
    paddingVertical: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardFuture: {
    backgroundColor: colors.surfaceDim,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  upcomingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: colors.toastInfoSubtle,
    borderWidth: 1,
    borderColor: colors.toastInfoBorder,
  },
  upcomingBadgeText: {
    color: colors.toastInfo,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardLeft: {
    gap: 4,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: fontSize.base,
    fontFamily: fonts.semiBold,
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
  cardAmount: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
    fontVariant: ["tabular-nums"],
  },
  amountNormal: {
    color: colors.amber,
  },
  amountPositive: {
    color: colors.teal,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  recurringIcon: {
    opacity: 0.7,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.tealSubtle,
  },
  editText: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    color: colors.dangerText,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  deleteConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.dangerSubtle,
  },
  deleteConfirmText: {
    color: colors.dangerText,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  cancelSmallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelSmallText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
