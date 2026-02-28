import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { SearchMap } from "@/features/map/SearchMap";
import type { BookingDetailsScreenController } from "@/features/bookings/hooks/useBookingDetailsScreenState";
import { getTokenColor } from "@/lib/themeTokens";

function formatCurrency(amount: number | undefined, currency: string | undefined) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const code = typeof currency === "string" && currency.trim() ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

type BookingDetailsContentProps = {
  state: BookingDetailsScreenController;
  mode: "light" | "dark";
};

export function BookingDetailsContent({ state, mode }: BookingDetailsContentProps) {
  const { t } = useTranslation();
  const details = state.details!;
  const hostCollectionConfirmedAt = details.collection?.hostCollectionConfirmedAt
    ? new Date(details.collection.hostCollectionConfirmedAt)
    : null;
  const renterCollectionConfirmedAt = details.collection?.renterCollectionConfirmedAt
    ? new Date(details.collection.renterCollectionConfirmedAt)
    : null;
  const lockboxCodeVisibleAt = state.collectionCodeVisibleAt
    ? new Date(state.collectionCodeVisibleAt)
    : null;
  const isCollectionFullyConfirmed = Boolean(hostCollectionConfirmedAt && renterCollectionConfirmedAt);

  const mapSection = (
    <View>
      <Text className="text-base font-semibold text-foreground">{t("bookingDetails.mapTitle")}</Text>
      <Text className="text-xs text-muted-foreground mt-1">
        {t("bookingDetails.mapSubtitle", {
          city: details.car?.location?.city ?? t("common.unknown"),
          country: details.car?.location?.country ?? t("common.unknown"),
        })}
      </Text>
      {state.mapCars.length > 0 ? (
        <SearchMap
          region={state.mapRegion}
          cars={state.mapCars}
          interactive={true}
          fitToCars={false}
          selectedCarId={state.mapCars[0].id}
          onOfferPress={state.handleOpenCarOffer}
          containerClassName={state.mapContainerClassName}
        />
      ) : (
        <Text className="mt-3 text-sm text-muted-foreground">{t("bookingDetails.mapUnavailable")}</Text>
      )}
    </View>
  );

  const detailsSection = (
    <View>
      <View className="pb-6 border-b border-border/50">
        <View className="flex-row items-start">
          {details.car?.images?.[0] ? (
            <Image source={{ uri: details.car.images[0] }} className="w-20 h-20 rounded-2xl" />
          ) : (
            <View className="w-20 h-20 rounded-2xl bg-secondary" />
          )}
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {details.car?.title || `${details.car?.make ?? t("trips.carFallback")} ${details.car?.model ?? ""}`}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {details.car?.make} {details.car?.model} - {details.car?.year}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1.5">{state.tripDateLabel}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-y-2">
          <View className={`${state.isTablet ? "w-1/2 pr-4" : "w-full"}`}>
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.booking")}</Text>
            <Text className={`mt-0.5 text-sm font-semibold ${state.bookingStatusTone.text}`}>{state.bookingStatusLabel}</Text>
          </View>
          <View className={`${state.isTablet ? "w-1/2 pr-4" : "w-full"}`}>
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.payment")}</Text>
            <Text className={`mt-0.5 text-sm font-semibold ${state.paymentStatusTone.text}`}>{state.paymentStatusLabel}</Text>
          </View>
          {state.isHostViewer ? (
            <View className={`${state.isTablet ? "w-1/2 pr-4" : "w-full"}`}>
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.payout")}</Text>
              <Text className={`mt-0.5 text-sm font-semibold ${state.payoutStatusTone?.text ?? "text-muted-foreground"}`}>
                {state.payoutStatusLabel}
              </Text>
            </View>
          ) : null}
          {details.payment?.depositStatus ? (
            <View className={`${state.isTablet ? "w-1/2 pr-4" : "w-full"}`}>
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.deposit")}</Text>
              <Text className={`mt-0.5 text-sm font-semibold ${state.depositStatusTone.text}`}>{state.depositStatusLabel}</Text>
            </View>
          ) : null}
        </View>

        {details.payment?.paymentDueAt ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            {t("bookingDetails.paymentDue", { date: new Date(details.payment.paymentDueAt).toLocaleString() })}
          </Text>
        ) : null}
        <View className="mt-4 rounded-xl border border-border p-3">
          <Text className="text-sm font-semibold text-foreground">{t("bookingDetails.collection.title")}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {t("bookingDetails.collection.method", { value: state.collectionMethodLabel })}
          </Text>
          {details.collection?.instructions ? (
            <Text className="mt-2 text-sm text-foreground">{details.collection.instructions}</Text>
          ) : null}
          {details.collection?.method === "lockbox" ? (
            <>
              {details.collection?.lockboxCode ? (
                <Text className="mt-2 text-sm text-foreground">
                  {t("bookingDetails.collection.lockboxCode", { value: details.collection.lockboxCode })}
                </Text>
              ) : lockboxCodeVisibleAt ? (
                <Text className="mt-2 text-xs text-muted-foreground">
                  {t("bookingDetails.collection.lockboxCodeHidden", {
                    date: lockboxCodeVisibleAt.toLocaleString(),
                  })}
                </Text>
              ) : null}
            </>
          ) : null}
          {hostCollectionConfirmedAt ? (
            <Text className="mt-2 text-xs text-muted-foreground">
              {t("bookingDetails.collection.hostConfirmedAt", {
                date: hostCollectionConfirmedAt.toLocaleString(),
              })}
            </Text>
          ) : null}
          {renterCollectionConfirmedAt ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              {t("bookingDetails.collection.renterConfirmedAt", {
                date: renterCollectionConfirmedAt.toLocaleString(),
              })}
            </Text>
          ) : null}
          {!isCollectionFullyConfirmed ? (
            <Pressable
              onPress={() => {
                void state.handleConfirmTripStartCollection();
              }}
              disabled={!state.canConfirmTripStartCollection || state.pendingCollectionConfirm}
              className={`mt-3 rounded-lg py-2 items-center ${
                !state.canConfirmTripStartCollection || state.pendingCollectionConfirm
                  ? "bg-primary/60"
                  : "bg-primary"
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {state.pendingCollectionConfirm
                  ? t("bookingDetails.collection.confirming")
                  : t("bookingDetails.collection.confirmAction")}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {state.payoutReleaseAt ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            {t("bookingDetails.transferScheduled", { date: state.payoutReleaseAt.toLocaleString() })}
          </Text>
        ) : null}
        {state.canRetryPayout ? (
          <Pressable
            onPress={() => {
              void state.handleRetryPayout();
            }}
            disabled={state.pendingPayoutRetry}
            className={`mt-3 rounded-lg py-2 items-center ${state.pendingPayoutRetry ? "bg-primary/60" : "bg-primary"}`}
          >
            <Text className="text-sm font-semibold text-primary-foreground">
              {state.pendingPayoutRetry ? t("bookingDetails.retryingPayout") : t("bookingDetails.retryPayout")}
            </Text>
          </Pressable>
        ) : null}

        {details.canPayNow || details.canCancel ? (
          <View className="mt-4 flex-row gap-2">
            {details.canPayNow ? (
              <Pressable
                onPress={() => {
                  void state.handlePayNow();
                }}
                disabled={state.pendingPayNow}
                className={`flex-1 rounded-xl py-2.5 items-center ${state.pendingPayNow ? "bg-primary/60" : "bg-primary"}`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {state.pendingPayNow ? t("carDetail.redirecting") : t("trips.payNow")}
                </Text>
              </Pressable>
            ) : null}
            {details.canCancel ? (
              <Pressable
                onPress={() => {
                  void state.handleCancelReservation();
                }}
                disabled={state.pendingCancel}
                className={`flex-1 rounded-xl py-2.5 items-center ${state.pendingCancel ? "bg-destructive/60" : "bg-destructive"}`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {state.pendingCancel ? t("trips.cancellingReservation") : t("trips.cancelReservation")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View className="mt-3">
          <Pressable
            onPress={state.handleOpenChat}
            className="rounded-xl border border-border bg-secondary px-3 py-2.5 flex-row items-center justify-between"
          >
            <Text className="text-sm font-semibold text-foreground">{t("bookingChat.openChat")}</Text>
            {Number(details.chat?.unreadCount ?? 0) > 0 ? (
              <View className="rounded-full bg-primary px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-primary-foreground">
                  {t("bookingChat.unreadLabel", { count: details.chat.unreadCount })}
                </Text>
              </View>
            ) : null}
          </Pressable>
          {!details.chat?.canSend && details.chat?.sendDisabledReason ? (
            <Text className="mt-1.5 text-xs text-muted-foreground">
              {t(`bookingChat.disabledReasons.${details.chat.sendDisabledReason}`)}
            </Text>
          ) : null}
        </View>

        {details.booking?.status === "completed" ? (
          <View className="mt-4 rounded-lg border border-border p-3">
            <Text className="text-sm font-semibold text-foreground mb-2">
              {state.isHostViewer ? t("profile.reviews.rateRenter") : t("profile.reviews.rateHost")}
            </Text>
            {details.myReview ? (
              <View>
                <Text className="text-xs text-muted-foreground">{t("profile.reviews.yourReview")}</Text>
                <View className="mt-1 flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Ionicons
                      key={`review-readonly-${rating}`}
                      name={rating <= details.myReview!.rating ? "star" : "star-outline"}
                      size={18}
                      color={getTokenColor(mode, "ratingStar")}
                    />
                  ))}
                </View>
                <Text className="mt-2 text-sm text-foreground">{details.myReview.comment}</Text>
              </View>
            ) : details.canReview ? (
              <View>
                <View className="flex-row gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Pressable
                      key={`review-draft-${rating}`}
                      onPress={() => state.setReviewDraft((prev) => ({ ...prev, rating }))}
                    >
                      <Ionicons
                        name={rating <= state.reviewDraft.rating ? "star" : "star-outline"}
                        size={18}
                        color={getTokenColor(mode, "ratingStar")}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={state.reviewDraft.comment}
                  onChangeText={(comment) => state.setReviewDraft((prev) => ({ ...prev, comment }))}
                  placeholder={t("profile.reviews.commentPlaceholder")}
                  placeholderTextColor={getTokenColor(mode, "placeholder")}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  multiline
                />
                <Pressable
                  onPress={() => {
                    void state.handleSubmitReview();
                  }}
                  disabled={state.pendingReview}
                  className={`mt-2 rounded-lg py-2 items-center ${state.pendingReview ? "bg-primary/60" : "bg-primary"}`}
                >
                  <Text className="text-sm font-semibold text-primary-foreground">{t("profile.reviews.submit")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="mt-6 flex-row flex-wrap">
        <View className={`pb-5 ${state.isTablet ? "" : "border-b border-border/40"}`} style={state.detailGridLeftItemStyle}>
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.locationTitle")}</Text>
          {details.car?.formattedAddress ? (
            <View className="mt-3">
              <Text className="text-xs text-muted-foreground">{t("bookingDetails.address")}</Text>
              <Text className="text-sm text-foreground mt-1 leading-5">{details.car.formattedAddress}</Text>
            </View>
          ) : null}
          <View className="mt-3">
            <Text className="text-xs text-muted-foreground">{t("bookingDetails.city")}</Text>
            <Text className="text-sm text-foreground mt-1">{details.car?.location?.city ?? t("common.unknown")}</Text>
          </View>
          <View className="mt-3">
            <Text className="text-xs text-muted-foreground">{t("bookingDetails.country")}</Text>
            <Text className="text-sm text-foreground mt-1">{details.car?.location?.country ?? t("common.unknown")}</Text>
          </View>
        </View>

        <View className={`pb-5 border-b border-border/40 ${state.isTablet ? "" : "pt-5"}`} style={state.detailGridRightItemStyle}>
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.paymentTitle")}</Text>
          <View className="mt-3 gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.rentalAmount")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.rentalAmount ?? details.booking.totalPrice, details.payment?.currency)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.platformFee")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.platformFeeAmount ?? 0, details.payment?.currency)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.depositAmount")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.depositAmount ?? 0, details.payment?.currency)}
              </Text>
            </View>
            <View className="h-px bg-border my-1" />
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">{t("bookingDetails.totalAmount")}</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  details.payment?.totalAmount ??
                    details.booking.totalPrice +
                      Number(details.payment?.platformFeeAmount ?? 0) +
                      Number(details.payment?.depositAmount ?? 0),
                  details.payment?.currency,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="pt-5" style={state.detailGridFullItemStyle}>
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.peopleTitle")}</Text>
          <View className="mt-3 flex-row flex-wrap">
            <View style={state.detailGridLeftItemStyle}>
              <Text className="text-xs uppercase tracking-wide text-muted-foreground">{t("bookingDetails.host")}</Text>
              {details.hostUser?.id ? (
                <Pressable onPress={() => state.openUserProfile(String(details.hostUser!.id), "host")}>
                  <Text className="text-sm font-medium text-foreground mt-1">{details.hostUser?.name ?? t("common.unknown")}</Text>
                </Pressable>
              ) : (
                <Text className="text-sm font-medium text-foreground mt-1">{details.hostUser?.name ?? t("common.unknown")}</Text>
              )}
            </View>
            <View className={`${state.isTablet ? "" : "mt-4"}`} style={state.detailGridRightItemStyle}>
              <Text className="text-xs uppercase tracking-wide text-muted-foreground">{t("bookingDetails.renter")}</Text>
              {details.renterUser?.id ? (
                <Pressable onPress={() => state.openUserProfile(String(details.renterUser!.id), "renter")}>
                  <Text className="text-sm font-medium text-foreground mt-1">{details.renterUser?.name ?? t("common.unknown")}</Text>
                </Pressable>
              ) : (
                <Text className="text-sm font-medium text-foreground mt-1">{details.renterUser?.name ?? t("common.unknown")}</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-center">
          <Pressable onPress={state.handleGoBack} className="w-9 h-9 rounded-full border border-border items-center justify-center">
            <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <Text className="ml-3 text-lg font-semibold text-foreground">{t("bookingDetails.title")}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="w-full pb-8">
          {state.isDesktop ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
              <View style={{ flex: 1 }}>{detailsSection}</View>
              <View style={{ flex: 1, minWidth: 420 }}>{mapSection}</View>
            </View>
          ) : (
            <View>
              {mapSection}
              <View className="mt-5">{detailsSection}</View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
