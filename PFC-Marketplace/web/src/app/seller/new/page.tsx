"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomNav } from "@/components/ui";

export default function NewListingPage() {
  const router = useRouter();
  const [type, setType] = useState("PHYSICAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceVnd, setPriceVnd] = useState(99000);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/seller/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        description,
        priceVnd,
        inventoryQty: type === "DIGITAL" ? null : 20,
        deliveryMeta: type === "PHYSICAL" ? "Ship nội thành" : undefined,
        serviceMeta: type === "SERVICE" ? "Online 45 phút" : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Tạo listing thất bại");
      return;
    }
    router.push("/seller");
  }

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Tạo listing</h1>
        <form className="mkt-card" onSubmit={onSubmit}>
          {error && <div className="mkt-error">{error}</div>}
          <label className="mkt-label">
            Loại
            <select className="mkt-input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="PHYSICAL">PHYSICAL</option>
              <option value="DIGITAL">DIGITAL</option>
              <option value="SERVICE">SERVICE</option>
            </select>
          </label>
          <label className="mkt-label">
            Tiêu đề
            <input className="mkt-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="mkt-label">
            Mô tả
            <textarea
              className="mkt-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
          <label className="mkt-label">
            Giá (VND)
            <input
              className="mkt-input"
              type="number"
              min={0}
              value={priceVnd}
              onChange={(e) => setPriceVnd(Number(e.target.value))}
              required
            />
          </label>
          <button className="mkt-btn" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu Draft"}
          </button>
        </form>
      </main>
      <BottomNav active="seller" />
    </>
  );
}
