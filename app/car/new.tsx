import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAction, useMutation } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { FEATURE_GROUPS } from "@/features/cars/components/lib/features";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type FieldErrors = Partial<Record<
  | "title"
  | "make"
  | "model"
  | "year"
  | "pricePerDay"
  | "city"
  | "country"
  | "latitude"
  | "longitude"
  | "images"
  | "availability"
  | "address"
  | "features",
  string
>>;

type AddressSuggestion = {
  description: string;
  placeId: string;
};

const MAX_IMAGES = 8;

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStartOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
}

function toEndOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
}

function randomToken(prefix: string) {
  const random = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  return `${prefix}-${random}`;
}

export default function NewCarScreen() {
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const generateCarImageUploadUrl = useMutation(api.cars.generateCarImageUploadUrl);
  const createCar = useMutation(api.cars.createCar);
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const verifyAndAutofillCarFromCepik = useAction(api.cars.verifyAndAutofillCarFromCepik);

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }, []);

  const [title, setTitle] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");

  const [vin, setVin] = useState("");
  const [registrationDate, setRegistrationDate] = useState(toDateInputValue(today));
  const [isCarVerified, setIsCarVerified] = useState(false);
  const [verificationSource, setVerificationSource] = useState<string | undefined>(undefined);
  const [verifiedAt, setVerifiedAt] = useState<number | undefined>(undefined);

  const [addressQuery, setAddressQuery] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeatureInput, setCustomFeatureInput] = useState("");
  const [customFeatures, setCustomFeatures] = useState<string[]>([]);

  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isVerifyingCar, setIsVerifyingCar] = useState(false);

  const [placesSessionToken] = useState(() => randomToken("places"));
  const [idempotencyKey] = useState(() => randomToken("car-create"));
  const submitLockRef = useRef(false);

  const isBusy = isSubmitting || isUploadingImages || isResolvingAddress || isVerifyingCar;

  useEffect(() => {
    const trimmed = addressQuery.trim();
    if (trimmed.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    let isCancelled = false;
    setIsSearchingAddress(true);

    const timeout = setTimeout(async () => {
      try {
        const suggestions = await searchAddresses({
          query: trimmed,
          sessionToken: placesSessionToken,
        });
        if (isCancelled) return;
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch {
        if (isCancelled) return;
        setAddressSuggestions([]);
      } finally {
        if (!isCancelled) {
          setIsSearchingAddress(false);
        }
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [addressQuery, placesSessionToken, searchAddresses]);

  const validate = () => {
    const errors: FieldErrors = {};
    const yearNumber = Number(year);
    const priceNumber = Number(pricePerDay);
    const latNumber = Number(latitude);
    const lngNumber = Number(longitude);
    const currentYear = new Date().getFullYear() + 1;

    if (!title.trim()) errors.title = "Title is required.";
    if (!make.trim()) errors.make = "Make is required.";
    if (!model.trim()) errors.model = "Model is required.";
    if (!year || Number.isNaN(yearNumber) || yearNumber < 1980 || yearNumber > currentYear) {
      errors.year = "Enter a valid year.";
    }
    if (!pricePerDay || Number.isNaN(priceNumber) || priceNumber <= 0) {
      errors.pricePerDay = "Enter a price greater than 0.";
    }
    if (!city.trim()) errors.city = "City is required.";
    if (!country.trim()) errors.country = "Country is required.";
    if (!formattedAddress.trim()) errors.address = "Please choose a valid address suggestion.";
    if (Number.isNaN(latNumber) || latNumber < -90 || latNumber > 90) {
      errors.latitude = "Latitude must be between -90 and 90.";
    }
    if (Number.isNaN(lngNumber) || lngNumber < -180 || lngNumber > 180) {
      errors.longitude = "Longitude must be between -180 and 180.";
    }
    if (images.length < 1) errors.images = "Please add at least one image.";
    if (selectedFeatures.length + customFeatures.length < 1) {
      errors.features = "Select at least one feature.";
    }
    if (new Date(toStartOfDayIso(startDate)).getTime() > new Date(toEndOfDayIso(endDate)).getTime()) {
      errors.availability = "Availability range is invalid.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.9,
    });

    if (result.canceled) return;

    setImages((prev) => {
      const merged = [...prev, ...result.assets];
      const uniqueByUri = merged.filter(
        (asset, index, all) => all.findIndex((a) => a.uri === asset.uri) === index,
      );
      return uniqueByUri.slice(0, MAX_IMAGES);
    });
    setFieldErrors((prev) => ({ ...prev, images: undefined }));
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((item) => item.uri !== uri));
  };

  const onSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setIsResolvingAddress(true);
    try {
      const details = await resolveAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: placesSessionToken,
      });

      setAddressQuery(suggestion.description);
      setFormattedAddress(details.formattedAddress || suggestion.description);
      setCity(details.city || city);
      setCountry(details.country || country || "Polska");
      setLatitude(Number(details.lat).toFixed(6));
      setLongitude(Number(details.lng).toFixed(6));
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setFieldErrors((prev) => ({
        ...prev,
        address: undefined,
        city: undefined,
        country: undefined,
        latitude: undefined,
        longitude: undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not resolve selected address.";
      Alert.alert("Address Error", message);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const addCustomFeature = () => {
    const value = customFeatureInput.trim();
    if (!value) return;
    if (
      selectedFeatures.includes(value) ||
      customFeatures.some((feature) => feature.toLowerCase() === value.toLowerCase())
    ) {
      setCustomFeatureInput("");
      return;
    }
    setCustomFeatures((prev) => [...prev, value]);
    setCustomFeatureInput("");
    setFieldErrors((prev) => ({ ...prev, features: undefined }));
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((value) => value !== feature)
        : [...prev, feature],
    );
    setFieldErrors((prev) => ({ ...prev, features: undefined }));
  };

  const handleCepikAutofill = async () => {
    if (!vin.trim()) {
      Alert.alert("VIN Required", "Enter VIN to use CEPiK autofill.");
      return;
    }

    setIsVerifyingCar(true);
    try {
      const result = await verifyAndAutofillCarFromCepik({
        vin: vin.trim().toUpperCase(),
        registrationDate: toStartOfDayIso(registrationDate),
      });

      setMake(result.make);
      setModel(result.model);
      setYear(String(result.year));
      if (Array.isArray(result.features) && result.features.length > 0) {
        setSelectedFeatures((prev) => Array.from(new Set([...prev, ...result.features])));
      }
      if (result.verified) {
        setIsCarVerified(true);
        setVerificationSource(result.source);
        setVerifiedAt(Date.now());
      }

      Alert.alert("CEPiK Verified", "Vehicle data has been autofilled and verified.");
    } catch (error) {
      setIsCarVerified(false);
      setVerificationSource(undefined);
      setVerifiedAt(undefined);
      const message = error instanceof Error ? error.message : "CEPiK lookup failed.";
      Alert.alert("CEPiK Error", message);
    } finally {
      setIsVerifyingCar(false);
    }
  };

  const uploadImages = async () => {
    setIsUploadingImages(true);
    try {
      const storageIds: string[] = [];
      for (const asset of images) {
        const uploadUrl = await generateCarImageUploadUrl({});
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": asset.mimeType ?? "application/octet-stream" },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload one of the selected images.");
        }

        const payload = (await uploadResponse.json()) as { storageId?: string };
        if (!payload.storageId) {
          throw new Error("Upload did not return a valid storage ID.");
        }
        storageIds.push(payload.storageId);
      }

      return storageIds;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || isBusy) return;
    submitLockRef.current = true;

    if (!validate()) {
      submitLockRef.current = false;
      return;
    }

    setIsSubmitting(true);
    try {
      const imageStorageIds = await uploadImages();
      const carId = await createCar({
        title: title.trim(),
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        pricePerDay: Number(pricePerDay),
        availableFrom: toStartOfDayIso(startDate),
        availableUntil: toEndOfDayIso(endDate),
        formattedAddress: formattedAddress.trim(),
        features: selectedFeatures,
        customFeatures,
        vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
        registrationDate: vin.trim() ? toStartOfDayIso(registrationDate) : undefined,
        isCarVerified,
        verificationSource,
        verifiedAt,
        idempotencyKey,
        location: {
          city: city.trim(),
          country: country.trim(),
          lat: Number(latitude),
          lng: Number(longitude),
        },
        imageStorageIds: imageStorageIds as Id<"_storage">[],
      });

      Alert.alert("Listing Created", "Your car has been added successfully.", [
        { text: "View Listing", onPress: () => router.replace(`/car/${carId}`) },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create listing.";
      Alert.alert("Create Listing Error", message);
      submitLockRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="py-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">Add New Car</Text>
          <View className="w-10 h-10" />
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-3">
          <Text className="text-base font-semibold text-foreground mb-3">Vehicle Basics</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Listing title"
            className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
          />
          {fieldErrors.title ? <Text className="text-xs text-destructive mb-2">{fieldErrors.title}</Text> : null}

          <TextInput
            value={make}
            onChangeText={setMake}
            placeholder="Make"
            className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
          />
          {fieldErrors.make ? <Text className="text-xs text-destructive mb-2">{fieldErrors.make}</Text> : null}

          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="Model"
            className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
          />
          {fieldErrors.model ? <Text className="text-xs text-destructive mb-2">{fieldErrors.model}</Text> : null}

          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextInput
                value={year}
                onChangeText={setYear}
                placeholder="Year"
                keyboardType="numeric"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.year ? <Text className="text-xs text-destructive mb-1">{fieldErrors.year}</Text> : null}
            </View>
            <View className="flex-1">
              <TextInput
                value={pricePerDay}
                onChangeText={setPricePerDay}
                placeholder="Price/day"
                keyboardType="numeric"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.pricePerDay ? <Text className="text-xs text-destructive mb-1">{fieldErrors.pricePerDay}</Text> : null}
            </View>
          </View>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-foreground">VIN + Registration Date</Text>
              {isCarVerified ? (
                <View className="px-2 py-1 bg-verified-bg rounded-full">
                  <Text className="text-[10px] font-semibold text-verified-fg">CAR VERIFIED</Text>
                </View>
              ) : null}
            </View>

          <TextInput
            value={vin}
            onChangeText={(value) => {
              setVin(value.toUpperCase());
              setIsCarVerified(false);
              setVerificationSource(undefined);
              setVerifiedAt(undefined);
            }}
            placeholder="VIN"
            autoCapitalize="characters"
            className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
          />

          <DateRangePicker
            startDate={registrationDate}
            endDate={registrationDate}
            onApply={(nextStartDate) => setRegistrationDate(nextStartDate)}
          />

          <Pressable
            onPress={handleCepikAutofill}
            disabled={isVerifyingCar}
            className={`rounded-lg px-3 py-3 mt-3 items-center ${isVerifyingCar ? "bg-primary/60" : "bg-primary"}`}
          >
            <Text className="text-sm font-semibold text-primary-foreground">
              {isVerifyingCar ? "Verifying with CEPiK..." : "Autofill from CEPiK"}
            </Text>
          </Pressable>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-3">
          <Text className="text-base font-semibold text-foreground mb-3">Address (Poland)</Text>
          <TextInput
            value={addressQuery}
            onChangeText={(value) => {
              setAddressQuery(value);
              setFormattedAddress("");
              setFieldErrors((prev) => ({ ...prev, address: undefined }));
              setShowAddressSuggestions(true);
            }}
            placeholder="Start typing precise address..."
            className="rounded-lg border border-border px-3 py-3 text-foreground"
          />

          {isSearchingAddress ? (
            <Text className="text-xs text-muted-foreground mt-2">Searching addresses...</Text>
          ) : null}

          {showAddressSuggestions && addressSuggestions.length > 0 ? (
            <View className="mt-2 rounded-lg border border-border overflow-hidden">
              {addressSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.placeId}
                  onPress={() => onSelectSuggestion(suggestion)}
                  className="px-3 py-3 border-b border-border bg-card"
                >
                  <Text className="text-sm text-foreground">{suggestion.description}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {fieldErrors.address ? <Text className="text-xs text-destructive mt-2">{fieldErrors.address}</Text> : null}

          <TextInput
            value={formattedAddress}
            onChangeText={setFormattedAddress}
            placeholder="Formatted address"
            className="rounded-lg border border-border px-3 py-3 text-foreground mt-3 mb-2"
          />

          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.city ? <Text className="text-xs text-destructive mb-1">{fieldErrors.city}</Text> : null}
            </View>
            <View className="flex-1">
              <TextInput
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.country ? <Text className="text-xs text-destructive mb-1">{fieldErrors.country}</Text> : null}
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextInput
                value={latitude}
                onChangeText={setLatitude}
                placeholder="Latitude"
                keyboardType="numeric"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.latitude ? <Text className="text-xs text-destructive mb-1">{fieldErrors.latitude}</Text> : null}
            </View>
            <View className="flex-1">
              <TextInput
                value={longitude}
                onChangeText={setLongitude}
                placeholder="Longitude"
                keyboardType="numeric"
                className="rounded-lg border border-border px-3 py-3 text-foreground mb-2"
              />
              {fieldErrors.longitude ? <Text className="text-xs text-destructive mb-1">{fieldErrors.longitude}</Text> : null}
            </View>
          </View>
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-3">
          <Text className="text-base font-semibold text-foreground mb-3">Availability</Text>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onApply={(nextStartDate, nextEndDate) => {
              setStartDate(nextStartDate);
              setEndDate(nextEndDate);
              setFieldErrors((prev) => ({ ...prev, availability: undefined }));
            }}
          />
          {fieldErrors.availability ? (
            <Text className="text-xs text-destructive mt-2">{fieldErrors.availability}</Text>
          ) : null}
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mb-3">
          <Text className="text-base font-semibold text-foreground mb-3">Features</Text>

          {FEATURE_GROUPS.map((group) => (
            <View key={group.title} className="mb-3">
              <Text className="text-xs uppercase text-muted-foreground mb-2">{group.title}</Text>
              <View className="flex-row flex-wrap gap-2">
                {group.items.map((feature) => {
                  const selected = selectedFeatures.includes(feature);
                  return (
                    <Pressable
                      key={`${group.title}-${feature}`}
                      onPress={() => toggleFeature(feature)}
                      className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-secondary border-border"}`}
                    >
                      <Text className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                        {feature}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <View className="flex-row gap-2 mt-2">
            <TextInput
              value={customFeatureInput}
              onChangeText={setCustomFeatureInput}
              placeholder="Add custom feature"
              className="flex-1 rounded-lg border border-border px-3 py-3 text-foreground"
            />
            <Pressable onPress={addCustomFeature} className="px-4 rounded-lg bg-primary items-center justify-center">
              <Text className="text-sm font-semibold text-primary-foreground">Add</Text>
            </Pressable>
          </View>

          {customFeatures.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {customFeatures.map((feature) => (
                <Pressable
                  key={`custom-${feature}`}
                  onPress={() => setCustomFeatures((prev) => prev.filter((item) => item !== feature))}
                  className="px-3 py-2 rounded-full border border-border bg-card flex-row items-center"
                >
                  <Text className="text-xs text-foreground mr-1">{feature}</Text>
                  <Ionicons name="close" size={12} color={getTokenColor(mode, "iconMuted")} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {fieldErrors.features ? <Text className="text-xs text-destructive mt-2">{fieldErrors.features}</Text> : null}
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mt-5 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">Images</Text>
            <Text className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</Text>
          </View>

          <Pressable
            onPress={pickImages}
            disabled={images.length >= MAX_IMAGES}
            className={`rounded-lg border border-border py-3 items-center ${images.length >= MAX_IMAGES ? "bg-secondary/70" : "bg-secondary"}`}
          >
            <Text className="text-sm font-medium text-foreground">
              {images.length >= MAX_IMAGES ? "Maximum images reached" : "Select photos"}
            </Text>
          </Pressable>

          {fieldErrors.images ? <Text className="text-xs text-destructive mt-2">{fieldErrors.images}</Text> : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            <View className="flex-row gap-3">
              {images.map((asset) => (
                <View key={asset.uri} className="relative">
                  <Image source={{ uri: asset.uri }} className="w-36 h-28 rounded-xl" resizeMode="cover" />
                  <Pressable
                    onPress={() => removeImage(asset.uri)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: getTokenColor(mode, "overlay") }}
                  >
                    <Ionicons name="close" size={14} color={getTokenColor(mode, "primaryForeground")} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={isBusy}
          className={`py-4 rounded-xl items-center ${isBusy ? "bg-primary/60" : "bg-primary"}`}
        >
          {isBusy ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={getTokenColor(mode, "primaryForeground")} />
              <Text className="text-primary-foreground font-semibold text-base ml-2">
                {isVerifyingCar
                  ? "Verifying car..."
                  : isUploadingImages
                    ? "Uploading images..."
                    : "Creating listing..."}
              </Text>
            </View>
          ) : (
            <Text className="text-primary-foreground font-semibold text-base">Create Listing</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


