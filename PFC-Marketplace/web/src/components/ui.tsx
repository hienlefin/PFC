import Link from "next/link";

const TYPE_LABEL: Record<string, string> = {
  PHYSICAL: "Vật lý",
  DIGITAL: "Digital",
  SERVICE: "Dịch vụ",
  COURSE: "Course",
  EVENT_TICKET: "Vé sự kiện",
};

export function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type;
}

export function BottomNav({ active }: { active: "home" | "cart" | "orders" | "seller" }) {
  const items = [
    { key: "home", href: "/", label: "Chợ" },
    { key: "cart", href: "/cart", label: "Giỏ" },
    { key: "orders", href: "/orders", label: "Đơn" },
    { key: "seller", href: "/seller", label: "Seller" },
  ] as const;
  return (
    <nav className="mkt-nav">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={active === item.key ? "active" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Money({ vnd }: { vnd: number }) {
  return (
    <span>
      {new Intl.NumberFormat("vi-VN").format(vnd)}
      <span className="text-xs text-[var(--mkt-muted)]"> đ</span>
    </span>
  );
}
