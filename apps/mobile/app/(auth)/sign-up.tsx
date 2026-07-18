import { useSignUp } from "@clerk/clerk-expo";
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

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;
    setPending(true);
    setError(null);
    try {
      const result = await signUp.create({ emailAddress: email, password });
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
              Create your account
            </Text>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.body.fontSize,
              }}
            >
              Track purchases and reminders across devices.
            </Text>
          </View>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? (
            <Card tone="danger">
              <Text style={{ color: tokens.colors.danger }}>{error}</Text>
            </Card>
          ) : null}
          <Button
            label={pending ? "Creating account…" : "Create account"}
            onPress={onSubmit}
            disabled={pending || !email || !password}
          />
          <Link href="/(auth)/sign-in">
            <Text
              style={{
                color: tokens.colors.accent,
                fontSize: tokens.type.body.fontSize,
                textAlign: "center",
              }}
            >
              Already have an account? Sign in
            </Text>
          </Link>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
