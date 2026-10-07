"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomNav, StatusBar, coverEmoji, typeLabel } from "@/components/ui";

const TYPES = [
  { value: "PHYSICAL", label: "Sách / vật lý" },
  { value: "DIGITAL", label: "Digital" },
  { value: "COURSE", label: "Khóa học" },
  { value: "SERVICE", label: "Dịch vụ" },
  { value: "EVENT_TICKET", label: "Sự kiện" },
] as const;

const TONES = [
  { value: "violet", label: "Violet" },
  { value: "indigo", label: "Indigo" },
  { value: "plum", label: "Plum" },
  { value: "lilac", label: "Lilac" },
  { value: "berry", label: "Berry" },
] as const;

export default function NewListingPage() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("PHYSICAL");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [priceVnd, setPriceVnd] = useState("");
  const [compareAtVnd, setCompareAtVnd] = useState("");
  const [coverTone, setCoverTone] = useState<(typeof TONES)[number]["value"]>("violet");
  const [inventoryQty, setInventoryQty] = useState("20");
  const [submitForReview, setSubmitForReview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const price = Number(priceVnd);
    const compare = compareAtVnd.trim() ? Number(compareAtVnd) : null;
    const qty =
      type === "DIGITAL" ? null : inventoryQty.trim() ? Number(inventoryQty) : 0;

    const res = await fetch("/api/seller/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        title: title.trim(),
        summary: summary.trim() || undefined,
        description: description.trim(),
        priceVnd: price,
        compareAtVnd: compare,
        coverTone,
        inventoryQty: qty,
        deliveryMeta: type === "PHYSICAL" ? "Ship nội thành 2–3 ngày" : undefined,
        serviceMeta: type === "SERVICE" ? "Online 45 phút" : undefined,
        submitForReview,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError("Cần đăng nhập seller@pfc.vn / Seller-PFC-2026 để thêm sản phẩm.");
      return;
    }
    if (!res.ok) {
      setError(data.error || "Tạo sản phẩm thất bại");
      return;
    }
    router.push("/seller");
    router.refresh();
  }

  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="back-title">
        <button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Quay lại">
          ←
        </button>
        <h1>Thêm sản phẩm</h1>
      </div>

      <div className="page-pad">
        <p className="page-sub" style={{ marginTop: 0 }}>
          Tạo listing mới cho Seller Center — lưu nháp hoặc gửi duyệt ngay.
        </p>

        <div className={`product-cover ${coverTone}`} style={{ height: 120, borderRadius: 16, marginBottom: 14 }}>
          <span style={{ fontSize: 48 }}>{coverEmoji(type)}</span>
        </div>

        <form className="card" onSubmit={onSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <label className="field">
            Loại sản phẩm
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} required>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Tên sản phẩm
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Sách Tư duy tài chính"
              required
              minLength={2}
            />
          </label>

          <label className="field">
            Tóm tắt ngắn
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Một dòng mô tả trên thẻ sản phẩm"
            />
          </label>

          <label className="field">
            Mô tả chi tiết
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nội dung, điều kiện, giao hàng…"
              required
              minLength={2}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="field">
              Giá bán (VND)
              <input
                type="number"
                min={0}
                step={1000}
                value={priceVnd}
                onChange={(e) => setPriceVnd(e.target.value)}
                placeholder="189000"
                required
              />
            </label>
            <label className="field">
              Giá gốc (tuỳ chọn)
              <input
                type="number"
                min={0}
                step={1000}
                value={compareAtVnd}
                onChange={(e) => setCompareAtVnd(e.target.value)}
                placeholder="250000"
              />
            </label>
          </div>

          {type !== "DIGITAL" && (
            <label className="field">
              Số lượng tồn
              <input
                type="number"
                min={0}
                value={inventoryQty}
                onChange={(e) => setInventoryQty(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            Màu cover ({typeLabel(type)})
            <select
              value={coverTone}
              onChange={(e) => setCoverTone(e.target.value as typeof coverTone)}
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="field"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexDirection: "row",
              color: "var(--pfc-text)",
              fontWeight: 650,
            }}
          >
            <input
              type="checkbox"
              checked={submitForReview}
              onChange={(e) => setSubmitForReview(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            Gửi duyệt ngay (Pending → Admin)
          </label>

          <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Đang lưu…" : submitForReview ? "Thêm & gửi duyệt" : "Lưu nháp"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 14, textAlign: "center" }}>
          Chưa phải seller?{" "}
          <Link href="/login" style={{ color: "var(--pfc-primary)", fontWeight: 650 }}>
            Đăng nhập seller@pfc.vn
          </Link>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
