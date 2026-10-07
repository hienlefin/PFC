"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, StatusBar } from "@/components/ui";
import { ROLE_LABELS, type Permission } from "@/domain/permissions";

type MemberRole = "BUYER" | "SELLER" | "CHU_NHIEM" | "TRUONG_CLB";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  roleLabel: string;
  permissions: Permission[];
  isLeadership?: boolean;
  seller?: { displayName: string; verificationTier: string } | null;
};

type MatrixRow = {
  permission: Permission;
  label: string;
  BUYER: boolean;
  SELLER: boolean;
  CHU_NHIEM: boolean;
  TRUONG_CLB: boolean;
};

export default function PermissionsPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [mRes, pRes] = await Promise.all([
      fetch("/api/admin/members"),
      fetch("/api/admin/permissions"),
    ]);
    if (mRes.status === 401 || pRes.status === 401) {
      router.push("/login");
      return;
    }
    if (mRes.status === 403 || pRes.status === 403) {
      setError(
        "Phân quyền chỉ dành cho Chủ nhiệm CLB và Trưởng CLB. Đăng nhập chunhiem@pfc.vn hoặc truong@pfc.vn",
      );
      setLoading(false);
      return;
    }
    const m = await mRes.json();
    const p = await pRes.json();
    setMembers(m.items || []);
    setMatrix(p.matrix || []);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError("Không tải được phân quyền");
      setLoading(false);
    });
  }, []);

  async function changeRole(memberId: string, role: MemberRole) {
    setBusyId(memberId);
    setError(null);
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Đổi quyền thất bại");
      return;
    }
    await load();
  }

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.push("/more")} aria-label="Quay lại">
          ←
        </button>
        <h1>Phân quyền</h1>
      </div>

      <div className="page-pad">
        <p className="page-sub" style={{ marginTop: 0 }}>
          Chỉ <strong>Chủ nhiệm câu lạc bộ</strong> và <strong>Trưởng câu lạc bộ</strong> được cấp / đổi quyền.
        </p>

        {error && (
          <div className="error-banner">
            {error}
            <div style={{ marginTop: 8 }}>
              <Link href="/login" style={{ color: "var(--pfc-danger)", fontWeight: 700 }}>
                Đăng nhập lãnh đạo CLB →
              </Link>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>Thành viên</h2>
        </div>

        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {members.map((m) => (
              <div key={m.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong>{m.name}</strong>
                  {m.isLeadership && <span className="role-pill">CLB</span>}
                </div>
                <p className="muted" style={{ margin: "4px 0 10px" }}>
                  {m.email}
                  {m.seller ? ` · Seller: ${m.seller.displayName}` : ""}
                </p>
                <label className="field" style={{ marginBottom: 0 }}>
                  Vai trò
                  <select
                    value={m.role}
                    disabled={busyId === m.id}
                    onChange={(e) => changeRole(m.id, e.target.value as MemberRole)}
                  >
                    <option value="BUYER">{ROLE_LABELS.BUYER}</option>
                    <option value="SELLER">{ROLE_LABELS.SELLER}</option>
                    <option value="CHU_NHIEM">{ROLE_LABELS.CHU_NHIEM}</option>
                    <option value="TRUONG_CLB">{ROLE_LABELS.TRUONG_CLB}</option>
                  </select>
                </label>
                <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                  {m.permissions.length} quyền · {m.roleLabel}
                </p>
              </div>
            ))}
            {!error && members.length === 0 && <div className="card muted">Chưa có thành viên.</div>}
          </div>
        )}

        <div className="section-head">
          <h2>Ma trận quyền</h2>
        </div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="rbac-table">
            <thead>
              <tr>
                <th>Quyền</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Chủ nhiệm</th>
                <th>Trưởng</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.permission}>
                  <td>
                    <div style={{ fontWeight: 650, fontSize: 11 }}>{row.label}</div>
                    <div className="muted" style={{ fontSize: 10 }}>
                      {row.permission}
                    </div>
                  </td>
                  <td>{row.BUYER ? "✓" : "—"}</td>
                  <td>{row.SELLER ? "✓" : "—"}</td>
                  <td>{row.CHU_NHIEM ? "✓" : "—"}</td>
                  <td>{row.TRUONG_CLB ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/admin" style={{ color: "var(--pfc-primary)", fontWeight: 650 }}>
            Hàng đợi duyệt listing →
          </Link>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
