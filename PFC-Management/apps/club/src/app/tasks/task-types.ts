/** Domain types for /tasks — keep stable for future API mapping. */

export type MemberRole = "Trưởng ban" | "Phó ban" | "Thành viên";
export type ClubRole = MemberRole | "Chủ nhiệm" | "Admin";

export type DepartmentId =
  | "chuyen_mon"
  | "doi_ngoai"
  | "ky_thuat"
  | "nhan_su"
  | "truyen_thong"
  | "su_kien";

export type BranchId =
  | "personal_finance"
  | "education_hub"
  | "project_marketplace"
  | "marketplace"
  | "opportunity_hub"
  | "club_management";

export type Priority = "low" | "medium" | "high";

export type TaskStatus =
  | "todo"
  | "doing"
  | "submitted"
  | "revision"
  | "redo"
  | "done";

export type ReviewResult = "approved" | "revision" | "redo";

export type HistoryType =
  | "assigned"
  | "submitted"
  | "revision"
  | "redo"
  | "approved"
  | "reminded";

export type Department = {
  id: DepartmentId;
  name: string;
  color: string;
  soft: string;
};

export type Branch = {
  id: BranchId;
  name: string;
  short: string;
  icon: string;
  color: string;
  soft: string;
};

export type Member = {
  id: string;
  name: string;
  initials: string;
  departmentId: DepartmentId;
  role: MemberRole;
};

export type CurrentUser = {
  id: string;
  name: string;
  clubRole: ClubRole;
  departmentId?: DepartmentId;
};

export type EvidenceFile = {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
};

export type SubmissionReview = {
  result: ReviewResult;
  comment: string;
  reviewedBy: string;
  reviewedAt: string;
  newDueDate: string | null;
};

export type Submission = {
  id: string;
  submittedAt: string;
  links: string[];
  files: EvidenceFile[];
  note: string;
  isLate: boolean;
  lateLabel: string | null;
  review: SubmissionReview | null;
};

export type HistoryEvent = {
  id: string;
  type: HistoryType;
  actorId: string;
  at: string;
  message: string;
};

export type Task = {
  id: string;
  branchId: BranchId;
  title: string;
  assigneeId: string;
  supervisorId: string;
  dueDate: string;
  priority: Priority;
  note: string;
  status: TaskStatus;
  lastRemindedAt: string | null;
  /** Nhắc duyệt cho take care khi submitted quá lâu */
  lastReviewRemindedAt: string | null;
  submissions: Submission[];
  history: HistoryEvent[];
};
