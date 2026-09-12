import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormError } from "@/components";
import { writeSettings } from "@/lib/settings";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => "")
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

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
        await writeSettings({
          authOnboardingPending: true,
          authOnboardingCompletedAt: null,
        });
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding/preferences");
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
      style={styles.container}
    >
      {/* Ambient background glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-up")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 32, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Verify your email
          </Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
          {destination ? (
            <View style={styles.destinationPill}>
              <Ionicons name="mail" size={14} color="#775DF5" />
              <Text style={styles.destinationText}>{destination}</Text>
            </View>
          ) : null}
        </View>

        {/* OTP Input Grid */}
        <View
          style={styles.otpRow}
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
                focusedIndex === idx && styles.otpBoxFocused,
                digit !== "" && styles.otpBoxFilled,
              ]}
            />
          ))}
        </View>

        <FormError message={error} />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={pending || !complete}
            onPress={() => void verifyCode(digits.join(""))}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pending || !complete) && { opacity: 0.5 },
              pressed && styles.primaryBtnPressed,
            ]}
          >
            {pending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleResend()}
            disabled={secondsLeft > 0}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
            accessibilityState={{ disabled: secondsLeft > 0 }}
            style={styles.resendPress}
          >
            <Text
              style={[
                styles.resendText,
                secondsLeft > 0 && styles.resendTextDisabled,
              ]}
            >
              {secondsLeft > 0
                ? `Resend code in ${secondsLeft}s`
                : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 28,
  },
  heading: {
    gap: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  destinationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  destinationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#775DF5",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  otpBoxFocused: {
    borderColor: "#775DF5",
    backgroundColor: "#F5F3FF",
  },
  otpBoxFilled: {
    borderColor: "#CBD5E1",
  },
  actions: {
    gap: 14,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendPress: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#775DF5",
  },
  resendTextDisabled: {
    color: "#94A3B8",
  },
});
