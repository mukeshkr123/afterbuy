import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card, Input } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        // 2FA required — send the email OTP then navigate to MFA screen.
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
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: tokens.spacing.lg,
        }}
      >
        <Card style={{ gap: tokens.spacing.md }}>
          <View style={{ gap: tokens.spacing.xs }}>
            <Text
              style={{
                fontSize: tokens.type.display.fontSize,
                fontWeight: "700",
                color: tokens.colors.text,
              }}
            >
              Welcome back
            </Text>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
              }}
            >
              Sign in to continue.
            </Text>
          </View>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="••••••••"
          />
          {error ? (
            <Card tone="danger">
              <Text
                style={{
                  color: tokens.colors.danger,
                  fontSize: tokens.type.bodySmall.fontSize,
                }}
              >
                {error}
              </Text>
            </Card>
          ) : null}
          <Button
            label={pending ? "Signing in…" : "Sign in"}
            onPress={onSubmit}
            disabled={pending || !email || !password}
          />
          <Link href="/(auth)/sign-up">
            <Text
              style={{
                color: tokens.colors.accent,
                fontSize: tokens.type.body.fontSize,
                textAlign: "center",
              }}
            >
              Create an account
            </Text>
          </Link>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
