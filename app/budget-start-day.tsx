import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Day } from "date-fns";
import { useBudget } from "@/context/BudgetContext";
import { DAY_KEYS } from "@/components/RecurringExpenseForm";
import FieldPicker, { PickerOption } from "@/components/FieldPicker";
import Toast from "@/components/Toast";
import { exportBackup } from "@/utils/backup";
import { getDeviceWeekStartDay } from "@/utils/deviceLocale";
import {
  CrashlyticsContext,
  CrashlyticsLog,
  logToCrashlytics,
  recordNonFatalError,
} from "@/utils/crashlytics";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";
import * as sharedStyles from "@/constants/sharedStyles";

interface ToastState {
  message: string;
  type: "success" | "error";
}

// Days ordered to match the device's locale convention (e.g. Sunday-first in
// the US, Monday-first in much of Europe).
function localeOrderedDays(): Day[] {
  const start = getDeviceWeekStartDay();
  return Array.from({ length: 7 }, (_, i) => ((start + i) % 7) as Day);
}

export default function BudgetStartDayScreen() {
  const { state, setWeekStartDay, t } = useBudget();
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState<Day>(state.weekStartDay);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const dayOptions: PickerOption[] = localeOrderedDays().map((d) => ({
    value: String(d),
    label: t(DAY_KEYS[d]),
  }));

  const hasChange = selectedDay !== state.weekStartDay;

  async function handleBackup() {
    try {
      await exportBackup(state);
      logToCrashlytics(CrashlyticsLog.BackupExportSucceeded);
      setToast({ message: t("backupExported"), type: "success" });
    } catch (err) {
      recordNonFatalError(
        err as Error,
        CrashlyticsContext.HandleExportBackupFailed,
      );
      setToast({ message: t("backupImportFailed"), type: "error" });
    }
  }

  function handleConfirm() {
    setWeekStartDay(selectedDay);
    logToCrashlytics(CrashlyticsLog.BudgetStartDayChanged);
    setShowConfirm(false);
    setToast({ message: t("budgetStartDayUpdated"), type: "success" });
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("setBudgetStartDay")}</Text>
          <Text style={styles.current}>
            {t("budgetStartDayCurrent")}{" "}
            <Text style={styles.currentDay}>
              {t(DAY_KEYS[state.weekStartDay])}
            </Text>
          </Text>
          <FieldPicker
            label={t("budgetStartDayPickerLabel")}
            value={String(selectedDay)}
            options={dayOptions}
            onChange={(v) => setSelectedDay(Number(v) as Day)}
          />
        </View>

        {/* Warning blurb */}
        <View style={styles.section}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning-outline" size={18} color={colors.amber} />
            <Text style={styles.warningTitle}>{t("experimental")}</Text>
          </View>

          <View style={styles.warningItem}>
            <Text style={styles.bullet}>1.</Text>
            <Text style={styles.warningText}>
              {t("budgetStartDayWarningBackup")}
            </Text>
          </View>
          <Pressable
            style={styles.backupButton}
            onPress={handleBackup}
            accessibilityLabel={t("exportBackup")}
            accessibilityRole="button"
          >
            <Ionicons
              name="cloud-download-outline"
              size={16}
              color={colors.white}
            />
            <Text style={styles.backupButtonText}>{t("exportBackup")}</Text>
          </Pressable>

          <View style={styles.warningItem}>
            <Text style={styles.bullet}>2.</Text>
            <Text style={styles.warningText}>
              {t("budgetStartDayWarningShift")}
            </Text>
          </View>
          <View style={styles.warningItem}>
            <Text style={styles.bullet}>3.</Text>
            <Text style={styles.warningText}>
              {t("budgetStartDayWarningAdjust")}
            </Text>
          </View>
        </View>

        {/* Apply */}
        <Pressable
          style={[styles.applyButton, !hasChange && styles.applyButtonDisabled]}
          onPress={() => setShowConfirm(true)}
          disabled={!hasChange}
          accessibilityLabel={t("setBudgetStartDay")}
          accessibilityRole="button"
        >
          <Text style={styles.applyButtonText}>{t("setBudgetStartDay")}</Text>
        </Pressable>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowConfirm(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {t("budgetStartDayConfirmTitle")}
            </Text>
            <Text style={styles.modalText}>
              {t("budgetStartDayWarningBackup")}
            </Text>
            <Text style={styles.modalText}>
              {t("budgetStartDayWarningShift")}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowConfirm(false)}
                accessibilityLabel={t("cancel")}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={styles.modalOk}
                onPress={handleConfirm}
                accessibilityLabel={t("ok")}
                accessibilityRole="button"
              >
                <Text style={styles.modalOkText}>{t("ok")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  },
  section: { ...sharedStyles.surfaceCard },
  sectionTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontFamily: fonts.semiBold,
  },
  current: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
  },
  currentDay: {
    color: colors.teal,
    fontFamily: fonts.semiBold,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    color: colors.amber,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  warningItem: {
    flexDirection: "row",
    gap: 8,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
  },
  warningText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  backupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.indigo,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  backupButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
  applyButton: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: 13,
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    color: colors.background,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
  },
  // Confirmation modal
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modalTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontFamily: fonts.bold,
  },
  modalText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
  modalOk: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
  },
  modalOkText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
  },
});
