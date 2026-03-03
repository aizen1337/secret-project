import { useEffect, useMemo } from "react";
import { authClient } from "@/lib/auth/authClient";

type AppUser = {
  id?: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
};

export function useAppAuth() {
  const { data, isPending } = authClient.useSession();

  useEffect(() => {
    void (async () => {
      await authClient.getSession();
      (authClient as any).updateSession?.();
    })();
  }, []);

  return {
    isLoaded: !isPending,
    isSignedIn: Boolean(data?.session),
    signOut: async () => {
      await authClient.signOut();
      await authClient.getSession();
      (authClient as any).updateSession?.();
    },
  };
}

export function useAppUser() {
  const { data } = authClient.useSession();
  const user = data?.user as any;

  return useMemo(() => {
    if (!user) return { user: null as AppUser | null };
    const name = typeof user.name === "string" ? user.name : "";
    const [firstName, ...rest] = name.split(" ").filter(Boolean);
    const lastName = rest.join(" ");
    return {
      user: {
        id: user.id,
        fullName: name || null,
        firstName: firstName || null,
        lastName: lastName || null,
        imageUrl: user.image ?? null,
        primaryEmailAddress: {
          emailAddress: user.email ?? null,
        },
      } satisfies AppUser,
    };
  }, [user]);
}
