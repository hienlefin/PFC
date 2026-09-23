export type Locale = "vi" | "en";

const VI = {
  "error.unauthenticated": "Bạn cần đăng nhập",
  "error.forbidden": "Bạn không có quyền thực hiện thao tác này",
  "error.rate_limited": "Bạn thao tác quá nhanh. Thử lại sau.",
  "error.private_club": "Câu lạc bộ riêng tư — chỉ thành viên được xem",
  "error.single_club": "Hệ thống PFC chỉ vận hành 1 câu lạc bộ",
  "notify.join_requested": "Yêu cầu tham gia CLB",
  "notify.approved": "Bạn đã được duyệt vào CLB",
  "notify.rejected": "Yêu cầu tham gia bị từ chối",
  "notify.role_changed": "Vai trò của bạn đã thay đổi",
  "notify.task_assigned": "Bạn được giao một công việc",
  "notify.deadline_soon": "Công việc sắp đến hạn",
  "notify.review_requested": "Công việc chờ bạn duyệt",
  "notify.activity_updated": "Hoạt động nội bộ có cập nhật",
  "notify.document_shared": "Tài liệu nội bộ mới",
  "empty.notifications": "Chưa có thông báo",
  "a11y.skip_to_content": "Bỏ qua đến nội dung chính",
} as const;

const EN: Record<keyof typeof VI, string> = {
  "error.unauthenticated": "You need to sign in",
  "error.forbidden": "You are not allowed to perform this action",
  "error.rate_limited": "Too many requests. Please try again later.",
  "error.private_club": "Private club — members only",
  "error.single_club": "PFC operates a single club only",
  "notify.join_requested": "Club join request",
  "notify.approved": "Your club join was approved",
  "notify.rejected": "Your club join was rejected",
  "notify.role_changed": "Your club role changed",
  "notify.task_assigned": "You were assigned a task",
  "notify.deadline_soon": "A task deadline is approaching",
  "notify.review_requested": "A task awaits your review",
  "notify.activity_updated": "An internal activity was updated",
  "notify.document_shared": "A new internal document",
  "empty.notifications": "No notifications yet",
  "a11y.skip_to_content": "Skip to main content",
};

const CATALOGS: Record<Locale, Record<keyof typeof VI, string>> = {
  vi: VI,
  en: EN,
};

export type MessageKey = keyof typeof VI;

export function resolveLocale(raw?: string | null): Locale {
  if (!raw) return "vi";
  const n = raw.toLowerCase();
  if (n.startsWith("en")) return "en";
  return "vi";
}

export function t(key: MessageKey, locale: Locale = "vi"): string {
  return CATALOGS[locale][key] ?? CATALOGS.vi[key] ?? key;
}
