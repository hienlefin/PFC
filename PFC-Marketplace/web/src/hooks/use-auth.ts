"use client";

import { useCallback, useEffect, useState } from "react";
import type { Permission } from "@/domain/permissions";

export type ClientUser = {
  id: string;
  email: string;
  name: string;
  role: "BUYER" | "SELLER" | "CHU_NHIEM" | "TRUONG_CLB";
  permissions: Permission[];
};

export function useAuth() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const can = useCallback(
    (permission: Permission) => Boolean(user?.permissions?.includes(permission)),
    [user],
  );

  return { user, loading, can, refresh };
}
