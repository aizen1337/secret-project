import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MAX_IMAGES } from "@/features/cars/form/constants";
import type { DisplayImage, FieldErrors } from "@/features/cars/form/types";

type ImagesStepProps = {
  images: DisplayImage[];
  fieldErrors: FieldErrors;
  removeOverlayColor: string;
  removeIconColor: string;
  t: (key: string) => string;
  onPickImages: () => void;
  onRemoveImage: (uri: string, source: "existing" | "new") => void;
};

export function ImagesStep({
  images,
  fieldErrors,
  removeOverlayColor,
  removeIconColor,
  t,
  onPickImages,
  onRemoveImage,
}: ImagesStepProps) {
  return (
    <View className="bg-card rounded-xl border border-border p-4 mt-5 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-foreground">{t("carForm.images.title")}</Text>
        <Text className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</Text>
      </View>

      <Pressable
        onPress={onPickImages}
        disabled={images.length >= MAX_IMAGES}
        className={`rounded-lg border border-border py-3 items-center ${images.length >= MAX_IMAGES ? "bg-secondary/70" : "bg-secondary"}`}
      >
        <Text className="text-sm font-medium text-foreground">
          {images.length >= MAX_IMAGES ? t("carForm.images.maxReached") : t("carForm.images.selectPhotos")}
        </Text>
      </Pressable>

      {fieldErrors.images ? <Text className="text-xs text-destructive mt-2">{fieldErrors.images}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
        <View className="flex-row gap-3">
          {images.map((image) => (
            <View key={`${image.source}-${image.uri}`} className="relative">
              <Image source={{ uri: image.uri }} className="w-36 h-28 rounded-xl" resizeMode="cover" />
              <Pressable
                onPress={() => onRemoveImage(image.uri, image.source)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: removeOverlayColor }}
              >
                <Ionicons name="close" size={14} color={removeIconColor} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
