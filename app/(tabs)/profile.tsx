'use client';

import { View, Text, SafeAreaView, Pressable, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ProfileScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const router = useRouter();

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
            <Ionicons name="person-outline" size={40} color="#737373" />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2 text-center">
            Log in to DriveShare
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-6">
            Create an account to book cars or list your own vehicle.
          </Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl mb-3 w-full max-w-xs">
              <Text className="text-primary-foreground font-semibold text-base text-center">
                Sign in
              </Text>
            </Pressable>
          </Link>
          <Link href="/sign-up" asChild>
            <Pressable className="border border-border px-6 py-3 rounded-xl w-full max-w-xs">
              <Text className="text-foreground font-semibold text-base text-center">
                Sign up
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    convexUser?.name ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Profile";
  const avatarUrl = convexUser?.imageUrl || user?.imageUrl;
  const memberSince = convexUser?.createdAt
    ? new Date(convexUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : null;

  const menuItems = [
    { icon: "person-outline", label: "Personal Info", href: "#" },
    { icon: "card-outline", label: "Payments", href: "#" },
    { icon: "shield-outline", label: "Privacy & Security", href: "#" },
    { icon: "notifications-outline", label: "Notifications", href: "#" },
    { icon: "help-circle-outline", label: "Help Center", href: "#" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        {/* Profile Header */}
        <View className="flex-row items-center mb-6">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
              <Ionicons name="person-outline" size={28} color="#737373" />
            </View>
          )}
          <View className="ml-4">
            <Text className="text-xl font-semibold text-foreground">
              {displayName}
            </Text>
            <Text className="text-sm text-muted-foreground capitalize">
              {convexUser ? "Member" : "Profile"}
            </Text>
            {memberSince ? (
              <Text className="text-xs text-muted-foreground">
                Member since {memberSince}
              </Text>
            ) : null}
            {user?.primaryEmailAddress?.emailAddress ? (
              <Text className="text-xs text-muted-foreground">
                {user.primaryEmailAddress.emailAddress}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-card rounded-xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              className={`flex-row items-center px-4 py-4 ${
                index < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color="#171717"
              />
              <Text className="flex-1 ml-3 text-base text-foreground">
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#737373" />
            </Pressable>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={() => {
            signOut();
            router.replace("/");
          }}
          className="mt-6 border border-destructive py-4 rounded-xl items-center"
        >
          <Text className="text-destructive font-semibold text-base">
            Log out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
