import { useMemo, useRef, useState } from "react";
import { PieChart } from "react-native-gifted-charts";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

const TOOLTIP_WIDTH = 220;
const TOOLTIP_PADDING = 8;

function SummaryCard({
  title,
  value,
  subtitle,
  iconName,
  color,
  tooltip,
}: SummaryCardProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const infoRef = useRef<Text>(null);
  const { width: screenWidth } = useWindowDimensions();
  const c = cardColors[color];

  function handleInfoPress() {
    if (tooltipPos) {
      setTooltipPos(null);
      return;
    }
    infoRef.current?.measureInWindow((x, y, w, h) => {
      const left = Math.min(
        Math.max(TOOLTIP_PADDING, x + w / 2 - TOOLTIP_WIDTH / 2),
        screenWidth - TOOLTIP_WIDTH - TOOLTIP_PADDING
      );
      // Place tooltip just below the ⓘ icon
      setTooltipPos({ x: left, y: y + h + 4 });
    });
  }

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
              ref={infoRef}
              style={[styles.tooltipToggle, { color: c.text }]}
              onPress={handleInfoPress}
            >
              ⓘ
            </Text>
          )}
        </View>
        <View style={[styles.cardIcon, { backgroundColor: c.subtle }]}>
          <Ionicons name={iconName} size={20} color={c.icon} />
        </View>
      </View>

      {tooltip && tooltipPos && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={() => setTooltipPos(null)}
          statusBarTranslucent
        >
          <Pressable style={styles.tooltipBackdrop} onPress={() => setTooltipPos(null)}>
            <View
              style={[
                styles.tooltipBox,
                { left: tooltipPos.x, top: tooltipPos.y },
              ]}
            >
              <Text style={styles.tooltipText}>{tooltip}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
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

  const pieData = useMemo(() => {
    const entries = Object.entries(stats.monthlyCategoryTotals)
      .map(([cat, { current }]) => ({ cat, value: current }))
      .filter(({ value }) => value > 0);

    const total = entries.reduce((s, e) => s + e.value, 0);
    if (total === 0) return { slices: [], total: 0 };

    const main: typeof entries = [];
    const small: typeof entries = [];
    entries.forEach((e) => {
      if (e.value / total >= 0.03) main.push(e);
      else small.push(e);
    });
    main.sort((a, b) => b.value - a.value);

    const slices = main.map(({ cat, value }) => ({
      value,
      color: getCatColor(state.categories, cat),
      label: tc(cat),
    }));

    if (small.length > 1) {
      slices.push({
        value: small.reduce((s, e) => s + e.value, 0),
        color: colors.textMuted,
        label: t("everythingElse"),
      });
    } else if (small.length === 1) {
      slices.push({
        value: small[0].value,
        color: getCatColor(state.categories, small[0].cat),
        label: tc(small[0].cat),
      });
    }

    return { slices, total };
  }, [stats.monthlyCategoryTotals, state.categories, tc, t]);

  const budgetPct = Math.min(
    100,
    stats.weeklyBudget > 0 ? (stats.spentThisWeek / stats.weeklyBudget) * 100 : 0
  );
  const budgetColor: CardColor =
    budgetPct > 90 ? "red" : budgetPct > 70 ? "amber" : "teal";

  const progressGradient: [string, string] =
    budgetPct > 90
      ? [colors.chartRed, colors.chartRedGrad]
      : budgetPct > 70
        ? [colors.amber, colors.chartAmberGrad]
        : [colors.chartTeal, colors.chartBlue];

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
            iconName="calculator-outline"
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
          <LinearGradient
            colors={progressGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${budgetPct}%` as `${number}%` }]}
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
            {pieData.slices.length === 0 ? (
              <Text style={styles.emptyText}>{t("noExpenses")}</Text>
            ) : (
              <View style={styles.pieWrapper}>
                <PieChart
                  data={pieData.slices}
                  donut
                  radius={110}
                  innerRadius={68}
                  innerCircleColor={colors.surface}
                  isAnimated
                  centerLabelComponent={() => (
                    <View style={styles.pieCenterLabel}>
                      <Text style={styles.pieCenterName}>{t("total")}</Text>
                      <Text style={styles.pieCenterAmount}>
                        {fc(pieData.total)}
                      </Text>
                    </View>
                  )}
                />
                <View style={styles.pieLegend}>
                  {pieData.slices.map((slice, i) => (
                    <View key={i} style={styles.pieLegendItem}>
                      <View
                        style={[
                          styles.pieLegendDot,
                          { backgroundColor: slice.color },
                        ]}
                      />
                      <View style={styles.pieLegendText}>
                        <Text style={styles.pieLegendName} numberOfLines={1}>
                          {slice.label}
                        </Text>
                        <Text style={styles.pieLegendAmount}>
                          {fc(slice.value)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
  tooltipBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tooltipBox: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
  // Monthly spending donut
  pieWrapper: {
    alignItems: "center",
    gap: 20,
  },
  pieCenterLabel: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  pieCenterName: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  pieCenterAmount: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },
  pieLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignSelf: "stretch",
  },
  pieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  pieLegendText: {
    flex: 1,
  },
  pieLegendName: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  pieLegendAmount: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
