import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>Không tìm thấy trang</h1>
      <Link href="/" className="btn-ghost">
        Về trang chủ
      </Link>
    </div>
  );
}
