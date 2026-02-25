import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/feedback/useToast";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

const MAX_IMAGES_PER_MESSAGE = 3;

type PendingImage = {
  uri: string;
  mimeType?: string | null;
};

type BookingChatPayload = {
  booking: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  viewerRole: "host" | "renter";
  counterpart: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  chat: {
    unreadCount: number;
    canSend: boolean;
    sendDisabledReason: "not_confirmed" | "expired" | "cancelled" | null;
    windowEndsAt: number;
  };
  messages: {
    id: string;
    senderUserId: string;
    sender: { name: string; imageUrl: string | null } | null;
    text: string | null;
    imageUrls: string[];
    createdAt: number;
  }[];
};

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toReadableFallback(status: string | undefined) {
  if (!status) return "-";
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function BookingChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingIdParam = normalizeParam(params.bookingId);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const bookingChat = useQuery(
    (api as any).bookingChat.getBookingChat,
    bookingIdParam
      ? {
          bookingId: bookingIdParam as Id<"bookings">,
          limit: 50,
        }
      : "skip",
  ) as BookingChatPayload | null | undefined;

  const sendBookingMessage = useMutation((api as any).bookingChat.sendBookingMessage);
  const markBookingChatRead = useMutation((api as any).bookingChat.markBookingChatRead);
  const generateBookingChatImageUploadUrl = useMutation(
    (api as any).bookingChat.generateBookingChatImageUploadUrl,
  );

  const [draftText, setDraftText] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const lastMessageId = bookingChat?.messages?.[bookingChat.messages.length - 1]?.id;

  useEffect(() => {
    if (!bookingIdParam || !bookingChat) return;
    if (Number(bookingChat.chat?.unreadCount ?? 0) <= 0) return;

    void markBookingChatRead({ bookingId: bookingIdParam as Id<"bookings"> }).catch(() => {
      // no-op for read marker failures
    });
  }, [bookingIdParam, bookingChat, lastMessageId, markBookingChatRead]);

  useEffect(() => {
    if (!lastMessageId) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(timeout);
  }, [lastMessageId]);

  useEffect(() => {
    const onShow = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    return () => {
      onShow.remove();
    };
  }, []);

  const isReadOnly = !bookingChat?.chat?.canSend;

  const bookingStatusLabel = useMemo(() => {
    const status = bookingChat?.booking?.status?.toLowerCase();
    const key = `trips.statuses.${status}`;
    const translated = t(key);
    if (translated === key) {
      return toReadableFallback(status);
    }
    return translated;
  }, [bookingChat?.booking?.status, t]);

  const tripDateLabel = useMemo(() => {
    if (!bookingChat?.booking?.startDate || !bookingChat?.booking?.endDate) {
      return null;
    }
    return `${new Date(bookingChat.booking.startDate).toLocaleDateString()} - ${new Date(
      bookingChat.booking.endDate,
    ).toLocaleDateString()}`;
  }, [bookingChat?.booking?.startDate, bookingChat?.booking?.endDate]);

  const disabledReasonLabel = useMemo(() => {
    const reason = bookingChat?.chat?.sendDisabledReason;
    if (!reason) return null;
    return t(`bookingChat.disabledReasons.${reason}`);
  }, [bookingChat?.chat?.sendDisabledReason, t]);

  const pickImages = async () => {
    if (isReadOnly || isSending) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES_PER_MESSAGE,
        quality: 0.85,
      });

      if (result.canceled) return;

      const merged = [...pendingImages, ...result.assets];
      const unique = merged.filter(
        (asset, index, all) => all.findIndex((entry) => entry.uri === asset.uri) === index,
      );
      setPendingImages(
        unique.slice(0, MAX_IMAGES_PER_MESSAGE).map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
        })),
      );
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "bookingChat.errors.pickImagesFailed"));
    }
  };

  const removePendingImage = (uri: string) => {
    setPendingImages((prev) => prev.filter((item) => item.uri !== uri));
  };

  const openFullscreenImage = (imageUrl: string) => {
    if (!imageUrl) return;
    setFullscreenImageUrl(imageUrl);
  };

  const closeFullscreenImage = () => {
    setFullscreenImageUrl(null);
  };

  const uploadPendingImages = async () => {
    if (!bookingIdParam || pendingImages.length === 0) return [];

    const storageIds: string[] = [];
    for (const asset of pendingImages) {
      const uploadUrl = await generateBookingChatImageUploadUrl({
        bookingId: bookingIdParam as Id<"bookings">,
      });

      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "application/octet-stream" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(t("bookingChat.errors.uploadFailed"));
      }

      const payload = (await uploadResponse.json()) as { storageId?: string };
      if (!payload.storageId) {
        throw new Error(t("bookingChat.errors.invalidStorage"));
      }
      storageIds.push(payload.storageId);
    }

    return storageIds;
  };

  const handleSend = async () => {
    if (!bookingIdParam || isReadOnly || isSending) return;

    const text = draftText.trim();
    if (!text && pendingImages.length === 0) {
      toast.warning(t("bookingChat.errors.emptyMessage"));
      return;
    }

    setIsSending(true);
    try {
      const imageStorageIds = await uploadPendingImages();
      await sendBookingMessage({
        bookingId: bookingIdParam as Id<"bookings">,
        text: text || undefined,
        imageStorageIds:
          imageStorageIds.length > 0 ? (imageStorageIds as Id<"_storage">[]) : undefined,
      });
      setDraftText("");
      setPendingImages([]);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "bookingChat.errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
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

  if (!bookingIdParam) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center">{t("bookingChat.unavailable")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingChat === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bookingChat) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center">{t("bookingChat.unavailable")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-start">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full border border-border items-center justify-center mt-0.5"
          >
            <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-foreground">{t("bookingChat.title")}</Text>
            <Text className="text-sm text-foreground">{bookingChat.counterpart.name}</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {bookingStatusLabel}
              {tripDateLabel ? ` - ${tripDateLabel}` : ""}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {bookingChat.messages.length === 0 ? (
            <View className="rounded-xl border border-border bg-card p-4">
              <Text className="text-sm text-muted-foreground">{t("bookingChat.empty")}</Text>
            </View>
          ) : (
            <View className="gap-3">
              {bookingChat.messages.map((message) => {
                const isMine = String(message.senderUserId) !== String(bookingChat.counterpart.id);
                return (
                  <View
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl border p-3 ${
                      isMine
                        ? "self-end bg-green-500/20 border-green-500/40"
                        : "self-start bg-card border-border"
                    }`}
                  >
                    {message.text ? (
                      <Text className={`text-sm ${isMine ? "text-foreground" : "text-foreground"}`}>
                        {message.text}
                      </Text>
                    ) : null}

                    {message.imageUrls.length > 0 ? (
                      <View className={`flex-row flex-wrap gap-2 ${message.text ? "mt-2" : ""}`}>
                        {message.imageUrls.map((imageUrl) => (
                          <Pressable
                            key={`${message.id}-${imageUrl}`}
                            onPress={() => openFullscreenImage(imageUrl)}
                          >
                            <Image
                              source={{ uri: imageUrl }}
                              className="w-24 h-24 rounded-lg bg-secondary"
                              resizeMode="cover"
                            />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    <Text className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(message.createdAt).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View
          className="border-t border-border bg-card px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {isReadOnly ? (
            <View className="mb-2 rounded-lg border border-border bg-secondary px-3 py-2">
              <Text className="text-xs text-muted-foreground">
                {disabledReasonLabel || t("bookingChat.readOnly")}
              </Text>
            </View>
          ) : null}

          {pendingImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {pendingImages.map((image) => (
                <View key={image.uri} className="relative">
                  <Pressable onPress={() => openFullscreenImage(image.uri)}>
                    <Image source={{ uri: image.uri }} className="w-16 h-16 rounded-lg bg-secondary" />
                  </Pressable>
                  <Pressable
                    onPress={() => removePendingImage(image.uri)}
                    className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-black/70 items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color={getTokenColor(mode, "primaryForeground")} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={() => {
                void pickImages();
              }}
              disabled={isReadOnly || isSending}
              className={`w-10 h-10 rounded-full border border-border items-center justify-center ${
                isReadOnly || isSending ? "opacity-50" : ""
              }`}
            >
              <Ionicons name="image-outline" size={18} color={getTokenColor(mode, "icon")} />
            </Pressable>

            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder={t("bookingChat.placeholder")}
              placeholderTextColor={getTokenColor(mode, "placeholder")}
              editable={!isReadOnly && !isSending}
              multiline
              className="flex-1 min-h-[40px] max-h-[120px] rounded-xl border border-border px-3 py-2 text-sm text-foreground"
            />

            <Pressable
              onPress={() => {
                void handleSend();
              }}
              disabled={isReadOnly || isSending}
              className={`rounded-xl px-3 py-2 ${isReadOnly || isSending ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSending ? t("common.loading") : t("bookingChat.send")}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-1 text-[11px] text-muted-foreground">
            {t("bookingChat.attachmentLimit", { count: MAX_IMAGES_PER_MESSAGE })}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(fullscreenImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={closeFullscreenImage}
      >
        <Pressable className="flex-1 bg-black/95" onPress={closeFullscreenImage}>
          <Pressable
            className="flex-1 items-center justify-center px-4"
            onPress={(event) => {
              event.stopPropagation();
            }}
          >
            {fullscreenImageUrl ? (
              <Image
                source={{ uri: fullscreenImageUrl }}
                style={{ width: "100%", height: "85%" }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
          <Pressable
            onPress={closeFullscreenImage}
            className="absolute right-4 h-14 w-14 rounded-full border border-white/70 bg-white items-center justify-center shadow-lg"
            style={{ top: Math.max(insets.top + 8, 16) }}
          >
            <Ionicons name="close" size={30} color="#111827" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
