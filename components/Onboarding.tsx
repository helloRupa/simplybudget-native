import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";
import { useBudget } from "@/context/BudgetContext";
import { TranslationKey } from "@/i18n/locales";

interface Slide {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const SLIDES: Slide[] = [
  {
    icon: "cash-outline",
    titleKey: "appName",
    bodyKey: "onboardingWelcomeBody",
  },
  {
    icon: "grid-outline",
    titleKey: "onboardingDashboardTitle",
    bodyKey: "onboardingDashboardBody",
  },
  {
    icon: "receipt-outline",
    titleKey: "onboardingExpensesTitle",
    bodyKey: "onboardingExpensesBody",
  },
  {
    icon: "repeat-outline",
    titleKey: "onboardingRecurringTitle",
    bodyKey: "onboardingRecurringBody",
  },
  {
    icon: "wallet-outline",
    titleKey: "onboardingBudgetTitle",
    bodyKey: "onboardingBudgetBody",
  },
];

interface OnboardingProps {
  onComplete: () => void;
  onGoToSettings: () => void;
}

export default function Onboarding({ onComplete, onGoToSettings }: OnboardingProps) {
  const { t } = useBudget();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  function handleSkip() {
    onComplete();
  }

  function handleBack() {
    setIndex((i) => i - 1);
  }

  function handleNext() {
    setIndex((i) => i + 1);
  }

  function handleSetBudget() {
    onComplete();
    onGoToSettings();
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.skip} onPress={handleSkip} accessibilityRole="button">
        <Text style={styles.skipText}>{t("onboardingSkip")}</Text>
      </Pressable>

      <View style={styles.content}>
        <Ionicons name={slide.icon} size={72} color={colors.teal} style={styles.icon} />
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.body}>{t(slide.bodyKey)}</Text>
        {isLast && (
          <Text style={styles.hint}>{t("onboardingBudgetStartDayHint")}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.nav}>
          <Pressable
            style={[styles.navButton, isFirst && styles.navButtonHidden]}
            onPress={handleBack}
            disabled={isFirst}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={18} color={colors.teal} />
            <Text style={styles.navButtonText}>{t("onboardingBack")}</Text>
          </Pressable>

          {isLast ? (
            <Pressable style={styles.actionButton} onPress={handleSetBudget} accessibilityRole="button">
              <Text style={styles.actionButtonText}>{t("onboardingSetBudget")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.background} />
            </Pressable>
          ) : (
            <Pressable style={styles.navButton} onPress={handleNext} accessibilityRole="button">
              <Text style={styles.navButtonText}>{t("onboardingNext")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.teal} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 999,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  skip: {
    alignSelf: "flex-end",
  },
  skipText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fonts.medium,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.hero,
    fontFamily: fonts.extraBold,
    textAlign: "center",
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.xxl,
    fontFamily: fonts.regular,
    textAlign: "center",
    lineHeight: 26,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    gap: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.teal,
    width: 20,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  navButtonHidden: {
    opacity: 0,
  },
  navButtonText: {
    color: colors.teal,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
  },
});
