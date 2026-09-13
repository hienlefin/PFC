export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function deadlineInfo(deadline?: string | Date | null, now = Date.now()) {
  if (!deadline) {
    return { label: "Không hạn", urgency: "none" as const, daysLeft: null as number | null };
  }
  const t = typeof deadline === "string" ? Date.parse(deadline) : deadline.getTime();
  if (Number.isNaN(t)) {
    return { label: "Không hạn", urgency: "none" as const, daysLeft: null };
  }
  const daysLeft = Math.ceil((t - now) / 86400000);
  if (daysLeft < 0) return { label: "Hết hạn", urgency: "passed" as const, daysLeft };
  if (daysLeft <= 2) return { label: `${daysLeft}d còn lại`, urgency: "imminent" as const, daysLeft };
  if (daysLeft <= 7) return { label: `${daysLeft}d còn lại`, urgency: "soon" as const, daysLeft };
  if (daysLeft <= 14) return { label: `${daysLeft}d còn lại`, urgency: "approaching" as const, daysLeft };
  return { label: `${daysLeft} ngày`, urgency: "normal" as const, daysLeft };
}

export const TYPE_LABEL: Record<string, string> = {
  INTERNSHIP: "Thực tập",
  JOB: "Việc làm",
  COMPETITION: "Cuộc thi",
  SCHOLARSHIP: "Học bổng",
};

export const STATUS_LABEL: Record<string, string> = {
  REDIRECTED: "Đã mở link ngoài",
  SUBMITTED: "Đã nộp",
  UNDER_REVIEW: "Đang xét",
  ACCEPTED: "Đậu",
  REJECTED: "Từ chối",
  WITHDRAWN: "Đã rút",
  DRAFT: "Nháp",
  CLOSED: "Đóng",
};
