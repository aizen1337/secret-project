import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { MAX_IMAGES_PER_MESSAGE } from "@/features/bookings/hooks/useBookingChatComposer";
import type { BookingChatScreenController } from "@/features/bookings/hooks/useBookingChatScreenState";
import { getTokenColor } from "@/lib/themeTokens";

type BookingChatContentProps = {
  state: BookingChatScreenController;
  mode: "light" | "dark";
};

export function BookingChatContent({ state, mode }: BookingChatContentProps) {
  const { t } = useTranslation();
  const bookingChat = state.bookingChat!;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-start">
          <Pressable
            onPress={() => state.router.back()}
            className="w-9 h-9 rounded-full border border-border items-center justify-center mt-0.5"
          >
            <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-foreground">{t("bookingChat.title")}</Text>
            <Text className="text-sm text-foreground">{bookingChat.counterpart.name}</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {state.bookingStatusLabel}
              {state.tripDateLabel ? ` - ${state.tripDateLabel}` : ""}
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
          ref={state.scrollRef}
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
                    {message.text ? <Text className="text-sm text-foreground">{message.text}</Text> : null}
                    {message.imageUrls.length > 0 ? (
                      <View className={`flex-row flex-wrap gap-2 ${message.text ? "mt-2" : ""}`}>
                        {message.imageUrls.map((imageUrl) => (
                          <Pressable key={`${message.id}-${imageUrl}`} onPress={() => state.openFullscreenImage(imageUrl)}>
                            <Image source={{ uri: imageUrl }} className="w-24 h-24 rounded-lg bg-secondary" resizeMode="cover" />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <Text className="mt-2 text-[11px] text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View className="border-t border-border bg-card px-4 pt-3" style={{ paddingBottom: Math.max(state.insets.bottom, 12) }}>
          {state.isReadOnly ? (
            <View className="mb-2 rounded-lg border border-border bg-secondary px-3 py-2">
              <Text className="text-xs text-muted-foreground">{state.disabledReasonLabel || t("bookingChat.readOnly")}</Text>
            </View>
          ) : null}

          {state.pendingImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {state.pendingImages.map((image) => (
                <View key={image.uri} className="relative">
                  <Pressable onPress={() => state.openFullscreenImage(image.uri)}>
                    <Image source={{ uri: image.uri }} className="w-16 h-16 rounded-lg bg-secondary" />
                  </Pressable>
                  <Pressable
                    onPress={() => state.removePendingImage(image.uri)}
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
                void state.pickImages();
              }}
              disabled={state.isReadOnly || state.isSending}
              className={`w-10 h-10 rounded-full border border-border items-center justify-center ${
                state.isReadOnly || state.isSending ? "opacity-50" : ""
              }`}
            >
              <Ionicons name="image-outline" size={18} color={getTokenColor(mode, "icon")} />
            </Pressable>

            <TextInput
              value={state.draftText}
              onChangeText={state.setDraftText}
              placeholder={t("bookingChat.placeholder")}
              placeholderTextColor={getTokenColor(mode, "placeholder")}
              editable={!state.isReadOnly && !state.isSending}
              multiline
              className="flex-1 min-h-[40px] max-h-[120px] rounded-xl border border-border px-3 py-2 text-sm text-foreground"
            />

            <Pressable
              onPress={() => {
                void state.handleSend();
              }}
              disabled={state.isReadOnly || state.isSending}
              className={`rounded-xl px-3 py-2 ${state.isReadOnly || state.isSending ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {state.isSending ? t("common.loading") : t("bookingChat.send")}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-1 text-[11px] text-muted-foreground">
            {t("bookingChat.attachmentLimit", { count: MAX_IMAGES_PER_MESSAGE })}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(state.fullscreenImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={state.closeFullscreenImage}
      >
        <Pressable className="flex-1 bg-black/95" onPress={state.closeFullscreenImage}>
          <Pressable
            className="flex-1 items-center justify-center px-4"
            onPress={(event) => {
              event.stopPropagation();
            }}
          >
            {state.fullscreenImageUrl ? (
              <Image source={{ uri: state.fullscreenImageUrl }} style={{ width: "100%", height: "85%" }} resizeMode="contain" />
            ) : null}
          </Pressable>
          <Pressable
            onPress={state.closeFullscreenImage}
            className="absolute right-4 h-14 w-14 rounded-full border border-white/70 bg-white items-center justify-center shadow-lg"
            style={{ top: Math.max(state.insets.top + 8, 16) }}
          >
            <Ionicons name="close" size={30} color="#111827" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
