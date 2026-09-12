import { useSignIn } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormError, Input } from "@/components";

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState(params.email ?? "");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to send a reset link.");
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Ambient pastel glow */}
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
              : router.replace("/(auth)/sign-in")
          }
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Reset Password</Text>
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
            Forgot password?
          </Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we&apos;ll send you
            instructions to reset your account.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(next) => {
              setEmail(next);
              setSent(false);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={() => void onSubmit()}
            leadingIcon={
              <Ionicons name="mail-outline" size={19} color="#64748B" />
            }
          />

          <FormError message={error} />

          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => void onSubmit()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pending && { opacity: 0.7 },
              pressed && styles.primaryBtnPressed,
            ]}
          >
            {pending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {sent ? "Resend Reset Link" : "Send Reset Link"}
              </Text>
            )}
          </Pressable>
        </View>

        {sent && (
          <View style={styles.confirmPanel}>
            <View style={styles.mailIconBox}>
              <Ionicons name="mail" size={26} color="#775DF5" />
            </View>
            <Text style={styles.panelTitle}>Check your inbox</Text>
            <Text style={styles.panelCopy}>
              We sent password reset instructions to{"\n"}
              <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                {email.trim()}
              </Text>
            </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              accessibilityRole="link"
              style={styles.returnLink}
            >
              <Text style={styles.linkText}>Return to Sign In</Text>
            </Pressable>
          </View>
        )}
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
    gap: 24,
  },
  heading: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },
  form: {
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
    marginTop: 6,
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
  confirmPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    padding: 24,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  mailIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  panelCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },
  returnLink: {
    marginTop: 10,
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#775DF5",
  },
});
