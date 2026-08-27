import { useEffect, useRef, type ReactNode } from "react";
import { Alert } from "react-native";

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
  destructive?: boolean;
  children?: ReactNode;
}

export function Dialog({
  visible,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onDismiss,
  destructive,
  children,
}: DialogProps) {
  const openRef = useRef(false);
  useEffect(() => {
    if (!visible || openRef.current) return;
    openRef.current = true;
    const buttons = [
      ...(secondaryLabel
        ? [
            {
              text: secondaryLabel,
              style: "cancel" as const,
              onPress: () => {
                openRef.current = false;
                (onSecondary ?? onDismiss)();
              },
            },
          ]
        : []),
      ...(primaryLabel
        ? [
            {
              text: primaryLabel,
              style: destructive
                ? ("destructive" as const)
                : ("default" as const),
              onPress: () => {
                openRef.current = false;
                onPrimary?.();
              },
            },
          ]
        : []),
    ];
    Alert.alert(title, description, buttons, {
      cancelable: true,
      onDismiss: () => {
        openRef.current = false;
        onDismiss();
      },
    });
  }, [
    description,
    destructive,
    onDismiss,
    onPrimary,
    onSecondary,
    primaryLabel,
    secondaryLabel,
    title,
    visible,
  ]);
  void children;
  return null;
}
