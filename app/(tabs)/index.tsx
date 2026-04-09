import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseISO, isWithinInterval } from "date-fns";
import { useBudget } from "@/context/BudgetContext";
import {
  getWeekRange,
  getMonthRange,
  getWeekRanges,
  toISODate,
  formatShortDate,
  getTotalBudgeted,
  getBudgetForWeek,
} from "@/utils/dates";
import { Category } from "@/types";
import SpendingChart from "@/components/SpendingChart";
import { colors } from "@/constants/colors";

function getCatColor(categories: Category[], name: string): string {
  return categories.find((c) => c.name === name)?.color ?? colors.textMuted;
}

// ---------------------------------------------------------------------------
// StyledAmount — large whole part, smaller cents
// ---------------------------------------------------------------------------

function StyledAmount({
  value,
  mainColor,
  centsColor,
}: {
  value: string;
  mainColor: string;
  centsColor: string;
}) {
  const match = value.match(/^([^\d]*)([\d,]+)(\.\d+)?(.*)$/);
  if (!match) {
    return <Text style={[styles.amountMain, { color: mainColor }]}>{value}</Text>;
  }
  const [, prefix, whole, decimal, suffix] = match;
  return (
    <Text>
      {prefix ? (
        <Text style={[styles.amountMain, { color: mainColor }]}>{prefix}</Text>
      ) : null}
      <Text style={[styles.amountMain, { color: mainColor }]}>{whole}</Text>
      {decimal ? (
        <Text style={[styles.amountCents, { color: centsColor }]}>{decimal}</Text>
      ) : null}
      {suffix ? (
        <Text style={[styles.amountMain, { color: mainColor }]}>{suffix}</Text>
      ) : null}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

type CardColor = "teal" | "green" | "red" | "amber";

const cardColors: Record<
  CardColor,
  { text: string; subtle: string; border: string; icon: string; cents: string }
> = {
  teal: {
    text: colors.teal,
    subtle: colors.tealSubtle,
    border: colors.tealBorder,
    icon: colors.teal,
    cents: colors.tealFaint,
  },
  green: {
    text: colors.greenText,
    subtle: colors.greenSubtle,
    border: colors.greenBorder,
    icon: colors.greenText,
    cents: colors.greenFaint,
  },
  red: {
    text: colors.dangerText,
    subtle: colors.dangerSubtle,
    border: "rgba(248,113,113,0.3)",
    icon: colors.dangerText,
    cents: colors.dangerFaint,
  },
  amber: {
    text: colors.amber,
    subtle: colors.amberSubtle,
    border: colors.amberBorder,
    icon: colors.amber,
    cents: colors.amberFaint,
  },
};

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  color: CardColor;
  tooltip?: string;
}

function SummaryCard({
  title,
  value,
  subtitle,
  iconName,
  color,
  tooltip,
}: SummaryCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const c = cardColors[color];

  return (
    <View style={[styles.card, { borderColor: c.border }]}>
      <View style={styles.cardInnerRow}>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.cardValueRow}>
            <StyledAmount value={value} mainColor={c.text} centsColor={c.cents} />
          </View>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
          {tooltip && (
            <Text
              style={[styles.tooltipToggle, { color: c.text }]}
              onPress={() => setShowTooltip((v) => !v)}
            >
              ⓘ
            </Text>
          )}
          {showTooltip && tooltip ? (
            <Text style={styles.tooltipText}>{tooltip}</Text>
          ) : null}
        </View>
        <View style={[styles.cardIcon, { backgroundColor: c.subtle }]}>
          <Ionicons name={iconName} size={20} color={c.icon} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const { state, t, tc, fc, fd, currencySymbol, intlLocale } = useBudget();

  const stats = useMemo(() => {
    const { start: weekStart, end: weekEnd } = getWeekRange();
    const { start: monthStart, end: monthEnd } = getMonthRange();

    const expensesInRange = (start: Date, end: Date) =>
      state.expenses.filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), { start, end });
        } catch {
          return false;
        }
      });

    const weekExpenses = expensesInRange(weekStart, weekEnd);
    const monthExpenses = expensesInRange(monthStart, monthEnd);

    const spentThisWeek = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
    const spentThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingThisWeek = state.weeklyBudget - spentThisWeek;
    const totalSpent = state.expenses.reduce((sum, e) => sum + e.amount, 0);

    const now = new Date();
    const weekRanges = getWeekRanges(state.firstUseDate);
    const totalBudgeted = getTotalBudgeted(state.firstUseDate, state.budgetHistory);
    const totalSpentToDate = state.expenses
      .filter((e) => {
        try {
          return e.date >= state.firstUseDate && parseISO(e.date) <= now;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + e.amount, 0);
    const totalSavedAllTime = totalBudgeted - totalSpentToDate;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    state.expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Weekly chart data (last 8 weeks)
    const weeklyChartData = weekRanges.slice(-8).map((range) => ({
      week: formatShortDate(range.start, intlLocale),
      spent: expensesInRange(range.start, range.end).reduce(
        (sum, e) => sum + e.amount,
        0
      ),
      budget: getBudgetForWeek(range.start, state.budgetHistory),
    }));

    // Monthly category data
    const today = toISODate(now);
    const monthlyCategoryTotals: Record<
      string,
      { current: number; future: number }
    > = {};
    monthExpenses.forEach((e) => {
      if (!monthlyCategoryTotals[e.category]) {
        monthlyCategoryTotals[e.category] = { current: 0, future: 0 };
      }
      if (e.date > today) {
        monthlyCategoryTotals[e.category].future += e.amount;
      } else {
        monthlyCategoryTotals[e.category].current += e.amount;
      }
    });

    return {
      spentThisWeek,
      spentThisMonth,
      remainingThisWeek,
      totalSavedAllTime,
      totalBudgeted,
      totalSpentToDate,
      numWeeks: weekRanges.length,
      topCategories,
      weeklyChartData,
      monthlyCategoryTotals,
      totalSpent,
      weeklyBudget: state.weeklyBudget,
    };
  }, [state, intlLocale]);

  const budgetPct = Math.min(
    100,
    stats.weeklyBudget > 0 ? (stats.spentThisWeek / stats.weeklyBudget) * 100 : 0
  );
  const budgetColor: CardColor =
    budgetPct > 90 ? "red" : budgetPct > 70 ? "amber" : "teal";

  const progressFillColor =
    budgetPct > 90
      ? colors.dangerText
      : budgetPct > 70
        ? colors.amber
        : colors.teal;

  const tooltipText = t("totalSavedTooltip")
    .replace("{startDate}", fd(state.firstUseDate))
    .replace("{weeks}", String(stats.numWeeks))
    .replace("{budgeted}", fc(stats.totalBudgeted))
    .replace("{spent}", fc(stats.totalSpentToDate));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Cards — 2×2 grid */}
      <View style={styles.cardGrid}>
        <View style={styles.cardRow}>
          <SummaryCard
            title={t("weeklyBudget")}
            value={fc(stats.weeklyBudget)}
            subtitle={t("perWeek")}
            iconName="wallet-outline"
            color="teal"
          />
          <SummaryCard
            title={t("spentThisWeek")}
            value={fc(stats.spentThisWeek)}
            subtitle={`${budgetPct.toFixed(0)}% ${t("of")} ${t("budget").toLowerCase()}`}
            iconName="card-outline"
            color={budgetColor}
          />
        </View>
        <View style={styles.cardRow}>
          <SummaryCard
            title={
              stats.remainingThisWeek >= 0
                ? t("remainingThisWeek")
                : t("overBudgetThisWeek")
            }
            value={fc(Math.abs(stats.remainingThisWeek))}
            subtitle={t("thisWeek")}
            iconName={
              stats.remainingThisWeek >= 0 ? "trending-up-outline" : "trending-down-outline"
            }
            color={stats.remainingThisWeek >= 0 ? "green" : "red"}
          />
          <SummaryCard
            title={
              stats.totalSavedAllTime >= 0
                ? t("totalSavedAllTime")
                : t("totalOverspentAllTime")
            }
            value={fc(Math.abs(stats.totalSavedAllTime))}
            subtitle={t("allTime")}
            iconName="home-outline"
            color={stats.totalSavedAllTime >= 0 ? "green" : "red"}
            tooltip={tooltipText}
          />
        </View>
      </View>

      {/* Budget Progress Bar */}
      <View style={styles.section}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{t("weeklyBudget")}</Text>
          <Text style={styles.progressValue}>
            {fc(stats.spentThisWeek)}{" "}
            <Text style={styles.progressTotal}>/ {fc(stats.weeklyBudget)}</Text>
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${budgetPct}%` as `${number}%`,
                backgroundColor: progressFillColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Empty state */}
      {state.expenses.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>{t("noExpensesYet")}</Text>
        </View>
      ) : (
        <>
          {/* Spending Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("budgetVsSpending")}</Text>
            <SpendingChart
              data={stats.weeklyChartData}
              t={t}
              fc={fc}
              currencySymbol={currencySymbol}
            />
          </View>

          {/* Top Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("topCategories")}</Text>
            <View style={styles.categoriesList}>
              {stats.topCategories.map(([category, amount]) => {
                const pct =
                  stats.totalSpent > 0
                    ? (amount / stats.totalSpent) * 100
                    : 0;
                const catColor = getCatColor(state.categories, category);
                return (
                  <View key={category} style={styles.categoryItem}>
                    <View style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[
                            styles.categoryAvatar,
                            { backgroundColor: catColor + "33" },
                          ]}
                        >
                          <Text style={[styles.categoryInitial, { color: catColor }]}>
                            {tc(category)[0]}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.categoryName}>{tc(category)}</Text>
                          <Text style={styles.categoryPct}>
                            {pct.toFixed(1)}% {t("of")} {t("total").toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.categoryAmount}>{fc(amount)}</Text>
                    </View>
                    <View style={styles.catProgressTrack}>
                      <View
                        style={[
                          styles.catProgressFill,
                          {
                            width: `${pct}%` as `${number}%`,
                            backgroundColor: catColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
              {stats.topCategories.length === 0 && (
                <Text style={styles.emptyText}>{t("noExpenses")}</Text>
              )}
            </View>
          </View>

          {/* Monthly Spending by Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("monthlySpending")}</Text>
            <View style={styles.monthlyGrid}>
              {Object.entries(stats.monthlyCategoryTotals)
                .sort(
                  ([, a], [, b]) =>
                    b.current + b.future - (a.current + a.future)
                )
                .map(([category, { current, future }]) => {
                  const isAllFuture = current === 0 && future > 0;
                  const catColor = getCatColor(state.categories, category);
                  return (
                    <View
                      key={category}
                      style={[
                        styles.monthlyCard,
                        isAllFuture && styles.monthlyCardFuture,
                      ]}
                    >
                      <View
                        style={[
                          styles.monthlyAvatar,
                          {
                            backgroundColor: catColor + "25",
                            borderColor: catColor + "40",
                          },
                        ]}
                      >
                        <Text style={[styles.monthlyInitial, { color: catColor }]}>
                          {tc(category)[0]}
                        </Text>
                      </View>
                      <Text style={styles.monthlyCatName} numberOfLines={1}>
                        {tc(category)}
                      </Text>
                      {future > 0 && current > 0 ? (
                        <Text style={styles.monthlyAmount}>
                          {fc(current)}{" "}
                          <Text style={styles.monthlyAmountFuture}>
                            + {fc(future)}
                          </Text>
                        </Text>
                      ) : (
                        <Text style={styles.monthlyAmount}>
                          {fc(current + future)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              {Object.keys(stats.monthlyCategoryTotals).length === 0 && (
                <Text style={styles.emptyText}>{t("noExpenses")}</Text>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  // Summary card grid
  cardGrid: {
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardInnerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValueRow: {
    marginTop: 4,
  },
  amountMain: {
    fontSize: 20,
    fontWeight: "700",
  },
  amountCents: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  tooltipToggle: {
    fontSize: 13,
    marginTop: 4,
  },
  tooltipText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    backgroundColor: colors.surfaceSubtle,
    padding: 8,
    borderRadius: 8,
  },
  // Progress bar
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  progressTotal: {
    color: colors.textMuted,
    fontWeight: "400",
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  // Empty state
  emptySection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Top categories
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    gap: 0,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  categoryAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInitial: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryName: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  categoryPct: {
    color: colors.textMuted,
    fontSize: 11,
  },
  categoryAmount: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  catProgressTrack: {
    height: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  catProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  // Monthly grid
  monthlyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthlyCard: {
    width: "30%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  monthlyCardFuture: {
    opacity: 0.5,
    borderStyle: "dashed",
  },
  monthlyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthlyInitial: {
    fontSize: 13,
    fontWeight: "700",
  },
  monthlyCatName: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  monthlyAmount: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  monthlyAmountFuture: {
    color: colors.textMuted,
    fontWeight: "400",
  },
});
