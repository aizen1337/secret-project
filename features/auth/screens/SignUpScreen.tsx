import { useColorScheme } from "nativewind";

import { useSignUpScreenState } from "@/features/auth/hooks/useSignUpScreenState";
import { SignUpContent } from "@/features/auth/ui/SignUpContent";
import { resolveThemeMode } from "@/lib/themeTokens";

export default function SignUpScreen() {
  const mode = resolveThemeMode(useColorScheme());
  const state = useSignUpScreenState();
  return <SignUpContent state={state} mode={mode} />;
}
