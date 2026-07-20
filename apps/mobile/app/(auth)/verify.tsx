import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(25);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FFFFFF";
  const accentColor = tokens.colors.accent ?? "#4F46E5";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const inputBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const inputBorder = isDark ? tokens.colors.border : "#E5E7EB";

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const fullCode = digits.join("");

  const handleDigitChange = (text: string, index: number) => {
    // Handle paste of 6 digits
    if (text.length > 1) {
      const pasted = text
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      const newDigits = [...digits];
      pasted.forEach((char, i) => {
        newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (pasted.length === 6) {
        verifyCode(newDigits.join(""));
      }
      return;
    }

    const cleanChar = text.replace(/[^0-9]/g, "");
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const updatedCode = newDigits.join("");
    if (updatedCode.length === 6 && !newDigits.includes("")) {
      verifyCode(updatedCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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

  const handleResend = async () => {
    if (secondsLeft > 0 || !isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSecondsLeft(30);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    }
  };

  const formattedTimer = `00:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: bgColor }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/(auth)/sign-up")
          }
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </Pressable>

        {/* Title & Subtitle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Verify OTP</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            We've sent a 6-digit code to
          </Text>
          <Text style={[styles.phoneText, { color: textColor }]}>
            +91 98765 43210
          </Text>
        </View>

        {/* 6-Digit OTP Box Grid */}
        <View style={styles.otpContainer}>
          {digits.map((digit, idx) => {
            const isFocused = focusedIndex === idx;
            return (
              <TextInput
                key={idx}
                ref={(ref) => {
                  inputRefs.current[idx] = ref;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: inputBg,
                    borderColor: isFocused ? accentColor : inputBorder,
                    color: textColor,
                  },
                ]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                onFocus={() => setFocusedIndex(idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            );
          })}
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Resend Timer / Resend Action */}
        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={[styles.resendTimerText, { color: textMuted }]}>
              Resend OTP in{" "}
              <Text style={{ fontWeight: "700", color: textMuted }}>
                {formattedTimer}
              </Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text style={[styles.resendLink, { color: accentColor }]}>
                Resend OTP
              </Text>
            </Pressable>
          )}
        </View>

        {/* Submit Action if needed */}
        {fullCode.length === 6 && (
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: accentColor },
              pending && { opacity: 0.7 },
              pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
            ]}
            onPress={() => verifyCode(fullCode)}
            disabled={pending}
          >
            <Text style={styles.submitButtonText}>
              {pending ? "Verifying…" : "Verify & Continue"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: "400",
  },
  phoneText: {
    fontSize: 17,
    marginTop: 4,
    fontWeight: "700",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 28,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },
  resendRow: {
    alignItems: "flex-start",
    marginBottom: 24,
  },
  resendTimerText: {
    fontSize: 15,
  },
  resendLink: {
    fontSize: 15,
    fontWeight: "700",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
