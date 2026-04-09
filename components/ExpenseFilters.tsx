import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBudget } from "@/context/BudgetContext";
import { FilterState } from "@/types";
import FieldPicker from "./FieldPicker";
import DateField from "./DateField";
import { colors } from "@/constants/colors";

interface ExpenseFiltersProps {
  filters: FilterState;
  defaultFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function ExpenseFilters({
  filters,
  defaultFilters,
  onFilterChange,
}: ExpenseFiltersProps) {
  const { state, t, tc } = useBudget();

  function updateFilter(key: keyof FilterState, value: string) {
    onFilterChange({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.dateFrom !== defaultFilters.dateFrom ||
    filters.dateTo !== defaultFilters.dateTo ||
    filters.category !== defaultFilters.category ||
    filters.searchQuery !== defaultFilters.searchQuery;

  const categoryOptions = [
    { label: t("allCategories"), value: "" },
    ...state.categories.map((cat) => ({
      label: tc(cat.name),
      value: cat.name,
    })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("filters")}</Text>
        {hasActiveFilters && (
          <Pressable onPress={() => onFilterChange(defaultFilters)}>
            <Text style={styles.resetText}>{t("resetFilters")}</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={filters.searchQuery}
          onChangeText={(v) => updateFilter("searchQuery", v)}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Category */}
      <FieldPicker
        label={t("category")}
        value={filters.category}
        options={categoryOptions}
        onChange={(v) => updateFilter("category", v)}
      />

      {/* Date range */}
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <DateField
            label={t("dateFrom")}
            value={filters.dateFrom}
            onChange={(v) => updateFilter("dateFrom", v)}
            placeholder="—"
          />
        </View>
        <View style={styles.dateField}>
          <DateField
            label={t("dateTo")}
            value={filters.dateTo}
            onChange={(v) => updateFilter("dateTo", v)}
            placeholder="—"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  resetText: {
    color: colors.teal,
    fontSize: 13,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    paddingVertical: 10,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
});
