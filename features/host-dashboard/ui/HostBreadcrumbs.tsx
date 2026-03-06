import { Link } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

type HostBreadcrumbItem = {
  label: string;
  href?: string;
};

type HostBreadcrumbsProps = {
  items: HostBreadcrumbItem[];
};

export function HostBreadcrumbs({ items }: HostBreadcrumbsProps) {
  if (Platform.OS !== "web" || items.length === 0) return null;

  return (
    <View className="mb-4 flex-row flex-wrap items-center gap-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = (
          <Text className={`text-xs ${isLast ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {item.label}
          </Text>
        );

        return (
          <View key={`${item.label}-${index}`} className="flex-row items-center">
            {item.href && !isLast ? (
              <Link href={item.href as any} asChild>
                <Pressable>{content}</Pressable>
              </Link>
            ) : (
              content
            )}
            {!isLast ? <Text className="mx-1 text-xs text-muted-foreground">/</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
