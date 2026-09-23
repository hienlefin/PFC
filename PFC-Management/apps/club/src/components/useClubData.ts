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
  teams: { id: string; name: string; description?: string; memberCount?: number }[];
  myMembership?: {
    id: string;
    status: string;
    position: string;
    teamId?: string | null;
  } | null;
  user?: { id: string; email: string; fullName: string; isSuperAdmin?: boolean };
  permissions?: string[];
  inviteLink?: { code: string; path: string; expiresAt?: string | Date | null } | null;
  report: {
    members: {
      total: number;
      active: number;
      pending: number;
      joinedThisMonth?: number;
    };
    tasks: {
      total: number;
      byStatus: Record<string, number>;
      doneThisMonth?: number;
    };
    activities: number;
    documents: number;
    linkedEvents: number;
    generatedAt?: string;
  } | null;
  members: {
    id: string;
    memberId: string;
    position: string;
    status: string;
    teamId?: string | null;
    teamName?: string | null;
    joinReason?: string | null;
    createdAt?: string | Date | null;
    joinedAt?: string | Date | null;
    fullName?: string;
    email?: string;
    studentCode?: string;
    tasksDone?: number;
    tasksTotal?: number;
    eventsJoined?: number;
    kpiScore?: number;
  }[];
  kanban: Record<
    string,
    {
      id: string;
      title: string;
      status: string;
      priority: string;
      description?: string;
      deadline?: string | Date | null;
      progress?: number;
      progressPct?: number;
      assigneeId?: string | null;
      assigneeName?: string | null;
      assigneeInitials?: string | null;
      teamId?: string | null;
      teamName?: string | null;
      activityId?: string | null;
      activityTitle?: string | null;
      checklistDone?: number;
      checklistTotal?: number;
      commentCount?: number;
      hasProof?: boolean;
      proofUrl?: string | null;
      subAssignees?: { id: string; name: string; initials: string }[];
    }[]
  >;
  taskScope?: {
    canFilterAllTeams: boolean;
    forcedTeamId: string | null;
    assigneeOnly: boolean;
    canManageTasks: boolean;
    teamId: string | null;
    position: string | null;
  } | null;
  timeline: {
    id: string;
    title: string;
    deadline: string | null;
    status: string;
    priority?: string;
  }[];
  activities: {
    id: string;
    title: string;
    status: string;
    description?: string;
    kind?: "internal" | "linked";
    mode?: string;
    coverUrl?: string | null;
    location?: string | null;
    bodyMd?: string;
    videoUrl?: string | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    capacity?: number | null;
    participantCount?: number | null;
  }[];
  documents: { id: string; title: string }[];
  links: {
    id: string;
    externalEventId: string;
    label: string | null;
    event?: {
      id: string;
      title: string;
      status: string;
      startsAt: string | null;
      endsAt?: string | null;
      mode: string;
      location?: string | null;
      summary?: string | null;
      coverUrl?: string | null;
      capacity?: number | null;
      registeredCount?: number | null;
      registerUrl: string;
      ticketUrl: string;
      myTicketUrl: string;
      checkInUrl: string;
      degraded: boolean;
    } | null;
  }[];
  approvalQueue?: {
    memberships: {
      id: string;
      fullName?: string;
      email?: string;
      status: string;
      teamId?: string | null;
      joinReason?: string | null;
      createdAt?: string | Date | null;
    }[];
    taskReviews: { id: string; title: string; status: string; priority: string }[];
    note?: string;
  };
  notifications?: {
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: string | Date | null;
    createdAt: string | Date;
  }[];
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

  const can = (perm: string) =>
    !!data?.permissions?.includes(perm) || !!data?.user?.isSuperAdmin;

  return { data, error, loading, reload, post, can };
}
