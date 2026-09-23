"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader, PfcLogo } from "@/components/MobileChrome";
import { useClubData } from "@/components/useClubData";

function JoinInner() {
  const router = useRouter();
  const search = useSearchParams();
  const codeFromUrl = (search.get("code") ?? "").toUpperCase();
  const { data, error, post, loading } = useClubData();
  const [reason, setReason] = useState("");
  const [inviteCode, setInviteCode] = useState(codeFromUrl);
  const [preferredTeamId, setPreferredTeamId] = useState("");
  const [preferredTeam2Id, setPreferredTeam2Id] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const club = data?.club;
  const mine = data?.myMembership;
  const teams = data?.teams ?? [];
  const activeCount = data?.report?.members?.active ?? 0;

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const teamNote =
        preferredTeam2Id && preferredTeam2Id !== preferredTeamId
          ? `NV2=${teams.find((t) => t.id === preferredTeam2Id)?.name ?? preferredTeam2Id}`
          : "";
      const res = await post({
        action: "join_club",
        clubId: club?.id,
        joinReason: [reason.trim(), teamNote].filter(Boolean).join(" | ") || undefined,
        inviteCode: inviteCode.trim() || undefined,
        preferredTeamId: preferredTeamId || undefined,
      });
      setMsg(
        res.join?.status === "pending"
          ? "Đã gửi yêu cầu — chờ ban điều hành duyệt."
          : "Bạn đã tham gia câu lạc bộ.",
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Không gửi được yêu cầu");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader title="Tham gia CLB" />
      {error && (
        <div className="error-banner">
          {error}{" "}
          <Link href="/login" className="btn-ghost">
            Đăng nhập
          </Link>
        </div>
      )}

      <section className="section">
        <div
          className="card"
          style={{
            background:
              "linear-gradient(145deg, var(--pfc-primary) 0%, #6b5a9e 100%)",
            color: "white",
            border: "none",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <PfcLogo size={52} />
            <div>
              <div style={{ fontWeight: 750, fontSize: 17 }}>
                {club?.name ?? "PFC — Personal Finance Club"}
              </div>
              <div style={{ opacity: 0.9, fontSize: 12, marginTop: 4 }}>
                {activeCount} thành viên ·{" "}
                {club?.visibility === "private" ? "Riêng tư" : "Công khai"}
              </div>
            </div>
          </div>
          <p style={{ marginTop: 14, marginBottom: 0, opacity: 0.95, fontSize: 13 }}>
            {club?.description ||
              "Cộng đồng học — thực hành — kết nối quanh tài chính cá nhân."}
          </p>
        </div>

        {loading && <p className="muted">Đang tải...</p>}

        {mine?.status === "active" && (
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 650 }}>Bạn đã là thành viên.</p>
            <Link href="/" className="btn-primary solid" style={{ marginTop: 12 }}>
              Vào trang chủ CLB
            </Link>
          </div>
        )}

        {mine?.status === "pending" && (
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>Yêu cầu của bạn đang chờ duyệt.</p>
          </div>
        )}

        {!mine && club && (
          <form className="card" style={{ marginTop: 12 }} onSubmit={onJoin}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Gửi yêu cầu tham gia
            </div>
            <label className="field">
              Mã mời (nếu có)
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC12XYZ"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              />
            </label>
            <label className="field" style={{ marginTop: 10, display: "block" }}>
              Ban nguyện vọng 1
              <select
                value={preferredTeamId}
                onChange={(e) => setPreferredTeamId(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              >
                <option value="">— Chưa chọn —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginTop: 10, display: "block" }}>
              Ban nguyện vọng 2 (tuỳ chọn)
              <select
                value={preferredTeam2Id}
                onChange={(e) => setPreferredTeam2Id(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              >
                <option value="">— Không chọn —</option>
                {teams
                  .filter((t) => t.id !== preferredTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field" style={{ marginTop: 10, display: "block" }}>
              Lý do tham gia
              {club.visibility === "private" && !inviteCode
                ? " (bắt buộc)"
                : " (tuỳ chọn)"}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Tôi muốn học quản lý tài chính cá nhân cùng PFC…"
                required={club.visibility === "private" && !inviteCode}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid var(--pfc-border)",
                  font: "inherit",
                }}
              />
            </label>
            {msg && <div className="error-banner">{msg}</div>}
            <button className="btn-primary solid" disabled={busy}>
              {busy ? "Đang gửi…" : "Tham gia CLB"}
            </button>
          </form>
        )}
      </section>
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải...</p>}>
      <JoinInner />
    </Suspense>
  );
}
