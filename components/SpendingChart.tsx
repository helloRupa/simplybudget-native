import { colors } from "@/constants/colors";
import { TranslationKey } from "@/i18n/locales";
import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";

// These must match the BarChart props below exactly
const Y_AXIS_WIDTH = 50;
const INITIAL_SPACING = 8;
const BAR_WIDTH = 26;
const BAR_SPACING = 10;
const CHART_HEIGHT = 180;
const NO_OF_SECTIONS = 4;

const TOOLTIP_WIDTH = 110;
const TOOLTIP_HEIGHT = 76;

interface ChartData {
  week: string;
  spent: number;
  budget: number;
}

interface TooltipState {
  idx: number;
  screenX: number; // bar center X in screen coords
  screenY: number; // top of bar in screen coords
}

interface SpendingChartProps {
  data: ChartData[];
  t: (key: TranslationKey) => string;
  fc: (amount: number) => string;
  currencySymbol: string;
}

function getBarColors(
  spent: number,
  budget: number,
): { frontColor: string; gradientColor: string } {
  if (budget <= 0) {
    return { frontColor: colors.chartTeal, gradientColor: colors.chartBlue };
  }
  const pct = (spent / budget) * 100;
  if (pct > 90) {
    return { frontColor: colors.chartRed, gradientColor: colors.chartRedGrad };
  }
  if (pct > 70) {
    return { frontColor: colors.amber, gradientColor: colors.chartAmberGrad };
  }
  return { frontColor: colors.chartTeal, gradientColor: colors.chartBlue };
}

/** Mirror gifted-charts' max-value logic: round up to a nice step size. */
function approxChartMax(dataMax: number): number {
  if (dataMax <= 0) return NO_OF_SECTIONS * 5;
  const rawStep = dataMax / NO_OF_SECTIONS;
  const niceStep = Math.ceil(rawStep / 5) * 5 || 5;
  return niceStep * NO_OF_SECTIONS;
}

export default function SpendingChart({
  data,
  t,
  fc,
  currencySymbol,
}: SpendingChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<View>(null);
  const tooltipRef = useRef(tooltip);
  tooltipRef.current = tooltip;

  const chartData = useMemo(
    () =>
      data.map((d, idx) => {
        const { frontColor, gradientColor } = getBarColors(d.spent, d.budget);
        return {
          value: d.spent,
          label: d.week,
          frontColor,
          gradientColor,
          showGradient: true,
          onPress: () => {
            if (tooltipRef.current?.idx === idx) {
              setTooltip(null);
              return;
            }
            containerRef.current?.measureInWindow((cx, cy) => {
              // Horizontal center of this bar on screen
              const barCenterX =
                cx +
                Y_AXIS_WIDTH +
                INITIAL_SPACING +
                idx * (BAR_WIDTH + BAR_SPACING) +
                BAR_WIDTH / 2;

              // Vertical: compute bar top Y using mirrored gifted-charts scale
              const dataMax = Math.max(...data.map((item) => item.spent), 1);
              const chartMax = approxChartMax(dataMax);
              const barHeightPx = (d.spent / chartMax) * CHART_HEIGHT;
              const barTopOffset = CHART_HEIGHT - barHeightPx;
              // cy is top of the chart container; add bar-top offset to get bar top on screen
              const barTopScreenY = cy + barTopOffset;

              setTooltip({ idx, screenX: barCenterX, screenY: barTopScreenY });
            });
          },
        };
      }),
    [data],
  );

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t("noChartData")}</Text>
      </View>
    );
  }

  // content padding (16×2) + section padding (16×2) + 8px visual adjustment
  const CHART_HORIZONTAL_INSET = 72;
  const chartWidth = screenWidth - CHART_HORIZONTAL_INSET;
  const selected = tooltip !== null ? data[tooltip.idx] : null;

  // Center tooltip on bar; clamp to screen edges
  const tooltipLeft = tooltip
    ? Math.min(
        Math.max(8, tooltip.screenX - TOOLTIP_WIDTH / 2),
        screenWidth - TOOLTIP_WIDTH - 8,
      )
    : 0;
  // Float above the bar top; clamp so it never goes above the container top
  const tooltipTop = tooltip
    ? Math.max(
        tooltip.screenY - CHART_HEIGHT,
        tooltip.screenY - TOOLTIP_HEIGHT - 8,
      )
    : 0;

  return (
    <View ref={containerRef} style={styles.container}>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={CHART_HEIGHT}
        barWidth={BAR_WIDTH}
        spacing={BAR_SPACING}
        barBorderRadius={4}
        isAnimated
        noOfSections={NO_OF_SECTIONS}
        yAxisLabelPrefix={currencySymbol}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        rulesColor={colors.border}
        hideRules={false}
        backgroundColor={colors.surface}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        initialSpacing={INITIAL_SPACING}
      />

      {/* Full-screen Modal — renders above everything; any tap closes */}
      <Modal
        visible={tooltip !== null}
        transparent
        animationType="none"
        onRequestClose={() => setTooltip(null)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTooltip(null)}
        >
          {selected && (
            <View
              style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}
            >
              <Text style={styles.tooltipWeek}>{selected.week}</Text>
              <Text style={styles.tooltipSpent}>{fc(selected.spent)}</Text>
              <Text style={styles.tooltipBudget}>/ {fc(selected.budget)}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  empty: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipWeek: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tooltipSpent: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  tooltipBudget: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
