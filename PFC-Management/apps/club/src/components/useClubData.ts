"use client";

import { useCallback, useEffect, useState } from "react";

export type ClubHomeData = {
  club: {
    id: string;
    name: string;
    description: string;
    visibility: string;
    status: string;
  };
  teams: { id: string; name: string }[];
  report: {
    members: { total: number; active: number; pending: number };
    tasks: { total: number; byStatus: Record<string, number> };
    activities: number;
    documents: number;
    linkedEvents: number;
  };
  members: {
    id: string;
    memberId: string;
    position: string;
    status: string;
    fullName?: string;
    email?: string;
  }[];
  kanban: Record<string, { id: string; title: string; status: string; priority: string }[]>;
  timeline: { id: string; title: string; deadline: string | null; status: string }[];
  activities: { id: string; title: string; status: string }[];
  documents: { id: string; title: string }[];
  links: { id: string; externalEventId: string; label: string | null }[];
};

async function api(action: string, clubId?: string) {
  const q = new URLSearchParams({ action });
  if (clubId) q.set("clubId", clubId);
  const res = await fetch(`/api/club?${q.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
  return json;
}

export function useClubData() {
  const [data, setData] = useState<ClubHomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/club?action=bootstrap");
      const home = await api("home");
      setData(home as ClubHomeData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/club", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Thao tác thất bại");
    await reload();
    return json;
  }

  return { data, error, loading, reload, post };
}
