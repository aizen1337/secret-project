import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import type { TFunction } from "i18next";
import type { Id } from "@/convex/_generated/dataModel";
import { toLocalizedErrorMessage } from "@/lib/errors";
export const MAX_IMAGES_PER_MESSAGE = 3;
type PendingImage = {
  uri: string;
  mimeType?: string | null;
};
type UseBookingChatComposerParams = {
  t: TFunction;
  toast: {
    warning: (message: string) => void;
    error: (message: string) => void;
  };
  bookingIdParam: string | undefined;
  isReadOnly: boolean;
  sendBookingMessage: (args: {
    bookingId: Id<"bookings">;
    text?: string;
    imageStorageIds?: Id<"_storage">[];
  }) => Promise<unknown>;
  generateBookingChatImageUploadUrl: (args: { bookingId: Id<"bookings"> }) => Promise<string>;
};

export function useBookingChatComposer({
  t,
  toast,
  bookingIdParam,
  isReadOnly,
  sendBookingMessage,
  generateBookingChatImageUploadUrl,
}: UseBookingChatComposerParams) {
  const [draftText, setDraftText] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const pickImages = useCallback(async () => {
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
  }, [isReadOnly, isSending, pendingImages, t, toast]);
  const removePendingImage = useCallback((uri: string) => {
    setPendingImages((prev) => prev.filter((item) => item.uri !== uri));
  }, []);

  const uploadPendingImages = useCallback(async () => {
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
      if (!uploadResponse.ok) throw new Error(t("bookingChat.errors.uploadFailed"));
      const payload = (await uploadResponse.json()) as { storageId?: string };
      if (!payload.storageId) throw new Error(t("bookingChat.errors.invalidStorage"));
      storageIds.push(payload.storageId);
    }
    return storageIds;
  }, [bookingIdParam, generateBookingChatImageUploadUrl, pendingImages, t]);
  const handleSend = useCallback(async () => {
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
        imageStorageIds: imageStorageIds.length > 0 ? (imageStorageIds as Id<"_storage">[]) : undefined,
      });
      setDraftText("");
      setPendingImages([]);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "bookingChat.errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }, [
    bookingIdParam,
    draftText,
    isReadOnly,
    isSending,
    pendingImages.length,
    sendBookingMessage,
    t,
    toast,
    uploadPendingImages,
  ]);
  return {
    draftText,
    pendingImages,
    isSending,
    fullscreenImageUrl,
    setDraftText,
    pickImages,
    removePendingImage,
    handleSend,
    openFullscreenImage: (imageUrl: string) => imageUrl && setFullscreenImageUrl(imageUrl),
    closeFullscreenImage: () => setFullscreenImageUrl(null),
  };
}
