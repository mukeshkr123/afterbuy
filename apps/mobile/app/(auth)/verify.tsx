import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { Button, FormError, ScreenHeader, ScreenScroll } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { tokens } = useTheme();

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => "")
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // The address Clerk actually sent the code to, rather than a sample number.
  const destination = signUp?.emailAddress ?? null;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const verifyCode = async (codeToVerify: string) => {
    if (!isLoaded || !signUp) return;
    setPending(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: codeToVerify,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Verification incomplete.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setPending(false);
    }
  };

  const handleDigitChange = (text: string, index: number) => {
    // A pasted code fills the whole grid at once.
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, "").slice(0, CODE_LENGTH).split("");
      const next = [...digits];
      pasted.forEach((char, i) => {
        next[i] = char;
      });
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
      if (pasted.length === CODE_LENGTH) void verifyCode(next.join(""));
      return;
    }

    const clean = text.replace(/\D/g, "");
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (!next.includes("")) void verifyCode(next.join(""));
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSecondsLeft(RESEND_SECONDS);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend the code");
    }
  };

  const complete = !digits.includes("");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScreenScroll gap={tokens.spacing.xl}>
        <ScreenHeader
          title=""
          onBack={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-up")
          }
        />

        <View style={{ gap: tokens.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.display.fontSize - 2,
              },
            ]}
          >
            Check your email
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            We sent a {CODE_LENGTH}-digit code to
          </Text>
          {destination ? (
            <Text
              style={{
                color: tokens.colors.text,
                fontSize: tokens.type.body.fontSize,
                fontWeight: "700",
              }}
            >
              {destination}
            </Text>
          ) : null}
        </View>

        <View
          style={[styles.otpRow, { gap: tokens.spacing.sm }]}
          accessibilityLabel={`${CODE_LENGTH} digit verification code`}
        >
          {digits.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              onFocus={() => setFocusedIndex(idx)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              selectTextOnFocus
              accessibilityLabel={`Digit ${idx + 1}`}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={[
                styles.otpBox,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor:
                    focusedIndex === idx
                      ? tokens.colors.accent
                      : tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                  color: tokens.colors.text,
                },
              ]}
            />
          ))}
        </View>

        <FormError message={error} />

        <View style={{ gap: tokens.spacing.md }}>
          <Button
            label={pending ? "Verifying…" : "Verify"}
            disabled={pending || !complete}
            onPress={() => void verifyCode(digits.join(""))}
          />

          <Pressable
            onPress={() => void handleResend()}
            disabled={secondsLeft > 0}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
            accessibilityState={{ disabled: secondsLeft > 0 }}
            style={styles.resendPress}
          >
            <Text
              style={{
                color:
                  secondsLeft > 0
                    ? tokens.colors.textMuted
                    : tokens.colors.accent,
                fontSize: tokens.type.bodySmall.fontSize + 1,
                fontWeight: "600",
              }}
            >
              {secondsLeft > 0
                ? `Resend code in ${secondsLeft}s`
                : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  otpBox: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
  },
  resendPress: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
