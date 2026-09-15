"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav, Money, typeLabel } from "@/components/ui";

type Listing = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  description: string;
  priceVnd: number;
  deliveryMeta: string | null;
  serviceMeta: string | null;
  inventoryQty: number | null;
  seller: { displayName: string };
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Not found");
        setItem(d.item);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function addCart() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId: id, quantity: 1 }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      setError(data.error || "Không thêm được giỏ");
      return;
    }
    router.push("/cart");
  }

  if (error && !item) {
    return (
      <main className="mkt-section">
        <div className="mkt-error">{error}</div>
        <Link href="/">← Catalog</Link>
      </main>
    );
  }

  if (!item) {
    return <main className="mkt-section">Đang tải…</main>;
  }

  return (
    <>
      <main className="mkt-section" style={{ paddingTop: 24 }}>
        <Link href="/" style={{ color: "var(--mkt-accent)", fontSize: 14 }}>
          ← Catalog
        </Link>
        <div style={{ marginTop: 12 }} className="mkt-chip">
          {typeLabel(item.type)}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", margin: "10px 0" }}>
          {item.title}
        </h1>
        <p style={{ color: "var(--mkt-muted)", marginTop: 0 }}>{item.seller.displayName}</p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          <Money vnd={item.priceVnd} />
        </p>
        <div className="mkt-card" style={{ marginTop: 12 }}>
          <p style={{ marginTop: 0 }}>{item.description}</p>
          {item.deliveryMeta && (
            <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>Giao: {item.deliveryMeta}</p>
          )}
          {item.serviceMeta && (
            <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>Phạm vi: {item.serviceMeta}</p>
          )}
          {item.inventoryQty != null && (
            <p style={{ color: "var(--mkt-muted)", fontSize: 14 }}>Tồn: {item.inventoryQty}</p>
          )}
        </div>
        {error && <div className="mkt-error" style={{ marginTop: 12 }}>{error}</div>}
        <button className="mkt-btn" style={{ marginTop: 16 }} disabled={busy} onClick={addCart}>
          {busy ? "Đang thêm…" : "Thêm vào giỏ"}
        </button>
      </main>
      <BottomNav active="home" />
    </>
  );
}
