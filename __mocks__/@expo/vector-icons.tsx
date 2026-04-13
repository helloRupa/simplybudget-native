/**
 * Jest mock for @expo/vector-icons.
 * Replaces icon components with a plain Text so tests never trigger the
 * async font-loading setState that causes act() warnings.
 */
import React from "react";
import { Text } from "react-native";

const createIconMock = (family: string) =>
  function IconMock({ name, testID }: { name?: string; testID?: string }) {
    return <Text testID={testID ?? `icon-${family}-${name}`}>{name}</Text>;
  };

export const Ionicons = createIconMock("Ionicons");
export const MaterialIcons = createIconMock("MaterialIcons");
export const FontAwesome = createIconMock("FontAwesome");
export const AntDesign = createIconMock("AntDesign");
export const Feather = createIconMock("Feather");
