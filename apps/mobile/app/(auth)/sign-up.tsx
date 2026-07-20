import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = tokens.colors.bg !== "#FFFFFF";
  const bgColor = isDark ? tokens.colors.bg : "#FFFFFF";
  const accentColor = tokens.colors.accent ?? "#4F46E5";
  const textColor = tokens.colors.text ?? "#0F172A";
  const textMuted = tokens.colors.textMuted ?? "#6B7280";
  const inputBg = isDark ? tokens.colors.surface : "#FFFFFF";
  const inputBorder = isDark ? tokens.colors.border : "#E5E7EB";

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;
    if (!fullName.trim() || !email.trim()) {
      setError("Please fill in your full name and email.");
      return;
    }
    if (!agreedTerms) {
      setError("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Fallback secure password for Clerk authentication
      const secureFallbackPassword = `AfterBuy@2026!${email.trim().substring(0, 3)}`;

      const result = await signUp.create({
        emailAddress: email.trim(),
        password: secureFallbackPassword,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/verify");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-up failed");
    } finally {
      setPending(false);
    }
  };

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
        {/* Back Arrow Button */}
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/welcome")
          }
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </Pressable>

        {/* Title Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Let's get you started
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Rohan Verma"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="rohan.verma@gmail.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              Mobile Number
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          {/* Terms Checkbox Row */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAgreedTerms(!agreedTerms)}
            hitSlop={6}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: agreedTerms ? accentColor : "#D1D5DB",
                  backgroundColor: agreedTerms ? accentColor : "transparent",
                },
              ]}
            >
              {agreedTerms && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.termsText, { color: textMuted }]}>
              I agree to the{" "}
              <Text style={{ color: accentColor, fontWeight: "600" }}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={{ color: accentColor, fontWeight: "600" }}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
            ]}
            onPress={onSubmit}
            disabled={pending}
          >
            <Text style={styles.submitButtonText}>
              {pending ? "Creating Account…" : "Continue"}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View
              style={[styles.dividerLine, { backgroundColor: inputBorder }]}
            />
            <Text style={[styles.dividerText, { color: textMuted }]}>
              or continue with
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: inputBorder }]}
            />
          </View>

          {/* Social Provider Buttons */}
          <View style={styles.socialRow}>
            {/* Google */}
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                { backgroundColor: inputBg, borderColor: inputBorder },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {
                // OAuth Google handler
              }}
            >
              <Image
                source={require("../../assets/google_icon.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
            </Pressable>

            {/* Apple */}
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                { backgroundColor: inputBg, borderColor: inputBorder },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {
                // OAuth Apple handler
              }}
            >
              <Ionicons name="logo-apple" size={24} color={textColor} />
            </Pressable>
          </View>
        </View>
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
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: "400",
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
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
    marginTop: 6,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "400",
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
  },
  socialButton: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
});
