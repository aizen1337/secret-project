import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { bookingsApi } from "@/features/bookings/api";
import { toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function ChatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();

  const unreadTotal = useQuery(
    bookingsApi.bookingChat.getMyBookingChatUnreadTotal,
    isSignedIn ? {} : "skip",
  ) as number | undefined;

  const threads = useQuery(
    bookingsApi.bookingChat.listMyBookingChats,
    isSignedIn ? { limit: 100 } : "skip",
  ) as
    | {
        id: string;
        booking: { id: string; status: string; startDate: string; endDate: string };
        car: { id: string; title: string; make: string; model: string; imageUrl: string | null };
        counterpart: { id: string; name: string; imageUrl: string | null };
        unreadCount: number;
        lastMessagePreview: string;
        lastMessageAt: number;
        canSend: boolean;
        sendDisabledReason: "not_confirmed" | "expired" | "cancelled" | null;
      }[]
    | undefined;

  const openChat = (bookingId: string) => {
    if (!bookingId) return;
    router.push({
      pathname: "/booking/[bookingId]/chat",
      params: { bookingId },
    } as any);
  };

  const renderThreadItem = ({ item: thread }: { item: NonNullable<typeof threads>[number] }) => {
    const status = thread.booking.status?.toLowerCase();
    const key = `trips.statuses.${status}`;
    const statusLabel = t(key) === key ? toReadableFallback(status) : t(key);
    const dateLabel = `${new Date(thread.booking.startDate).toLocaleDateString()} - ${new Date(
      thread.booking.endDate,
    ).toLocaleDateString()}`;

    return (
      <Pressable
        onPress={() => openChat(thread.booking.id)}
        className="rounded-2xl border border-border bg-card p-3 mb-3"
      >
        <View className="flex-row items-center">
          {thread.car.imageUrl ? (
            <Image source={{ uri: thread.car.imageUrl }} className="w-14 h-14 rounded-xl" />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-secondary items-center justify-center">
              <Ionicons name="car-outline" size={18} color={getTokenColor(mode, "iconMuted")} />
            </View>
          )}
          <View className="ml-3 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {thread.car.title || `${thread.car.make} ${thread.car.model}`}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">{thread.counterpart.name}</Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {statusLabel} - {dateLabel}
                </Text>
              </View>
              {thread.unreadCount > 0 ? (
                <View className="rounded-full bg-primary px-2 py-0.5">
                  <Text className="text-[11px] font-semibold text-primary-foreground">
                    {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={1}>
          {thread.lastMessagePreview || t("bookingChat.noPreview")}
        </Text>
      </Pressable>
    );
  };

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center">{t("bookingChat.signInRequired")}</Text>
          <Pressable onPress={() => router.push("/sign-in")} className="mt-4 rounded-xl bg-primary px-5 py-2.5">
            <Text className="text-sm font-semibold text-primary-foreground">{t("common.actions.signIn")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!threads) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-foreground">{t("bookingChat.inboxTitle")}</Text>
          <View className="rounded-full bg-secondary px-2.5 py-1">
            <Text className="text-xs font-semibold text-muted-foreground">
              {t("bookingChat.unreadTotal", { count: Number(unreadTotal ?? 0) })}
            </Text>
          </View>
        </View>
      </View>

      {threads.length === 0 ? (
        <View className="flex-1 px-4 pt-4">
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">{t("bookingChat.inboxEmpty")}</Text>
          </View>
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4 pt-4"
          data={threads}
          keyExtractor={(thread) => thread.id}
          renderItem={renderThreadItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
