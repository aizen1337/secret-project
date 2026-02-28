import { useColorScheme } from "nativewind";

import { useSignInScreenState } from "@/features/auth/hooks/useSignInScreenState";
import { SignInContent } from "@/features/auth/ui/SignInContent";
import { resolveThemeMode } from "@/lib/themeTokens";

export default function SignInScreen() {
  const mode = resolveThemeMode(useColorScheme());
  const state = useSignInScreenState();
  return <SignInContent state={state} mode={mode} />;
}
