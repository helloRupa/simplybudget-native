import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppName from "@/components/AppName";
import { colors } from "@/constants/colors";
import { fonts, fontSize, radius } from "@/constants/typography";
import { authenticate } from "@/hooks/useLockAuth";
import { useBudget } from "@/context/BudgetContext";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { t } = useBudget();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const hasAutoPrompted = useRef(false);

  async function tryUnlock() {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const success = await authenticate(t("unlockApp"));
      if (success) {
        onUnlock();
      }
    } finally {
      setIsAuthenticating(false);
    }
  }

  // Auto-prompt once when the lock screen mounts
  useEffect(() => {
    if (!hasAutoPrompted.current) {
      hasAutoPrompted.current = true;
      tryUnlock();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AppName size="large" />
        <Ionicons
          name="lock-closed"
          size={48}
          color={colors.teal}
          style={styles.icon}
        />
        <Pressable
          style={[styles.button, isAuthenticating && styles.buttonDisabled]}
          onPress={tryUnlock}
          disabled={isAuthenticating}
          accessibilityRole="button"
          accessibilityLabel={t("unlockApp")}
        >
          <Ionicons
            name="finger-print"
            size={20}
            color={colors.background}
          />
          <Text style={styles.buttonText}>
            {isAuthenticating ? t("authenticating") : t("unlockApp")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  content: {
    alignItems: "center",
    gap: 24,
  },
  icon: {
    marginTop: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.teal,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
  },
});
