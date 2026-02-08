import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerTintColor: "#171717",
          headerTitleStyle: {
            fontWeight: "600",
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="car/[id]"
          options={{
            title: "Car Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: "Log In",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: "Sign Up",
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}
