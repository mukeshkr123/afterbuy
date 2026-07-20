import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null
  );
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
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        router.push("/(auth)/mfa");
      } else {
        setError("Additional verification required.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
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
        {/* Back Button */}
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
          <Text style={[styles.title, { color: textColor }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Sign in to continue managing your purchases
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>
              Email or Mobile Number
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor:
                    focusedField === "email" ? accentColor : inputBorder,
                  color: textColor,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: textColor }]}>Password</Text>
              <Pressable
                onPress={() => {
                  setError("Password reset link sent to your email.");
                }}
                hitSlop={6}
              >
                <Text style={[styles.forgotText, { color: accentColor }]}>
                  Forgot Password?
                </Text>
              </Pressable>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: inputBg,
                    borderColor:
                      focusedField === "password" ? accentColor : inputBorder,
                    color: textColor,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.eyeIconContainer}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Error / Success Banner */}
          {error ? (
            <View
              style={[
                styles.errorContainer,
                error.includes("sent") && { backgroundColor: "#ECFDF5" },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  error.includes("sent") && { color: "#059669" },
                ]}
              >
                {error}
              </Text>
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
              {pending ? "Signing In…" : "Sign In"}
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
                // Google OAuth handler
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
                // Apple OAuth handler
              }}
            >
              <Ionicons name="logo-apple" size={24} color={textColor} />
            </Pressable>
          </View>

          {/* Bottom Sign-Up Link */}
          <View style={styles.signUpRow}>
            <Text style={[styles.alreadyText, { color: textMuted }]}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text style={[styles.signUpLink, { color: accentColor }]}>
                Create Account
              </Text>
            </Link>
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "600",
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIconContainer: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
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
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  alreadyText: {
    fontSize: 15,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
