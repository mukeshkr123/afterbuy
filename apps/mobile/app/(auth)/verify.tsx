import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
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

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { tokens } = useTheme();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;
    setPending(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
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
          <Text
            style={{
              fontSize: tokens.type.display.fontSize,
              fontWeight: "700",
              color: tokens.colors.text,
            }}
          >
            Verify your email
          </Text>
          <Text style={{ color: tokens.colors.textMuted }}>
            We sent a 6-digit code to your email address.
          </Text>
          <Input
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          {error ? (
            <Card tone="danger">
              <Text style={{ color: tokens.colors.danger }}>{error}</Text>
            </Card>
          ) : null}
          <Button
            label={pending ? "Verifying…" : "Verify"}
            onPress={onSubmit}
            disabled={pending || code.length < 6}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
