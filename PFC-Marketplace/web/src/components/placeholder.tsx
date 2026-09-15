"use client";

import { BottomNav, StatusBar } from "@/components/ui";

export default function Placeholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="phone-scroll">
      <StatusBar />
      <div className="page-pad">
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{body}</p>
        <div className="card muted">
          Module này thuộc Digital Hub — chưa nối trong slice Marketplace P0.
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
