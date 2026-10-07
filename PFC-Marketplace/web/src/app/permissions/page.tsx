"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, StatusBar } from "@/components/ui";
import { ROLE_LABELS, type Permission } from "@/domain/permissions";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  roleLabel: string;
  permissions: Permission[];
  seller?: { displayName: string; verificationTier: string } | null;
};

type MatrixRow = {
  permission: Permission;
  label: string;
  BUYER: boolean;
  SELLER: boolean;
  ADMIN: boolean;
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
      setError("Chỉ Admin mới được phân quyền. Đăng nhập admin@pfc.vn / Admin-PFC-2026");
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

  async function changeRole(memberId: string, role: MemberRow["role"]) {
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
          RBAC Marketplace — gắn quyền theo vai trò Buyer / Seller / Admin. Deny by default.
        </p>

        {error && (
          <div className="error-banner">
            {error}
            <div style={{ marginTop: 8 }}>
              <Link href="/login" style={{ color: "var(--pfc-danger)", fontWeight: 700 }}>
                Đăng nhập Admin →
              </Link>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>Tài khoản</h2>
        </div>

        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {members.map((m) => (
              <div key={m.id} className="card">
                <strong style={{ display: "block" }}>{m.name}</strong>
                <p className="muted" style={{ margin: "4px 0 10px" }}>
                  {m.email}
                  {m.seller ? ` · Seller: ${m.seller.displayName}` : ""}
                </p>
                <label className="field" style={{ marginBottom: 0 }}>
                  Vai trò
                  <select
                    value={m.role}
                    disabled={busyId === m.id}
                    onChange={(e) => changeRole(m.id, e.target.value as MemberRow["role"])}
                  >
                    <option value="BUYER">{ROLE_LABELS.BUYER}</option>
                    <option value="SELLER">{ROLE_LABELS.SELLER}</option>
                    <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
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
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="rbac-table">
            <thead>
              <tr>
                <th>Quyền</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.permission}>
                  <td>
                    <div style={{ fontWeight: 650, fontSize: 12 }}>{row.label}</div>
                    <div className="muted" style={{ fontSize: 10 }}>
                      {row.permission}
                    </div>
                  </td>
                  <td>{row.BUYER ? "✓" : "—"}</td>
                  <td>{row.SELLER ? "✓" : "—"}</td>
                  <td>{row.ADMIN ? "✓" : "—"}</td>
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
