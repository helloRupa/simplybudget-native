import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBudget } from "@/context/BudgetContext";
import AppName from "./AppName";
import { colors } from "@/constants/colors";
import { fonts, fontSize } from "@/constants/typography";

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutModal({ visible, onClose }: AboutModalProps) {
  const { t } = useBudget();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <View style={styles.logoRow}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <AppName size="small" />
            <Text style={styles.version}>{t("aboutVersion")} 0.1.0</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{t("aboutDescription")}</Text>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("aboutBuiltBy")}</Text>
              <Text style={styles.value}>Rupa {t("and")} Claude Code</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("aboutBuiltWith")}</Text>
              <Text style={styles.value}>
                React Native, Expo, TypeScript, expo-sqlite
              </Text>
            </View>
          </View>

          {/* Close */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t("close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  version: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontFamily: fonts.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  details: {
    gap: 8,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    flexShrink: 0,
  },
  value: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    flex: 1,
  },
  closeButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.tealFaint,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    alignItems: "center",
  },
  closeText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontFamily: fonts.semiBold,
  },
});
