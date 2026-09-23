import type {
  Branch,
  BranchId,
  CurrentUser,
  Department,
  HistoryType,
  Member,
  Task,
} from "./task-types";

export const DEPARTMENTS: Department[] = [
  { id: "chuyen_mon", name: "Ban Chuyên môn", color: "#7c3aed", soft: "#f5f3ff" },
  { id: "doi_ngoai", name: "Ban Đối ngoại", color: "#2563eb", soft: "#eff6ff" },
  { id: "ky_thuat", name: "Ban Kỹ thuật", color: "#0f766e", soft: "#f0fdfa" },
  { id: "nhan_su", name: "Ban Nhân sự", color: "#db2777", soft: "#fdf2f8" },
  { id: "truyen_thong", name: "Ban Truyền thông", color: "#d97706", soft: "#fffbeb" },
  { id: "su_kien", name: "Ban Sự kiện", color: "#4f46e5", soft: "#eef2ff" },
];

export const BRANCHES: Branch[] = [
  {
    id: "personal_finance",
    name: "Personal Finance",
    short: "PF",
    icon: "💰",
    color: "#7c3aed",
    soft: "#f5f3ff",
  },
  {
    id: "education_hub",
    name: "Education Hub",
    short: "EDU",
    icon: "📚",
    color: "#2563eb",
    soft: "#eff6ff",
  },
  {
    id: "project_marketplace",
    name: "Project Marketplace",
    short: "PM",
    icon: "🧩",
    color: "#db2777",
    soft: "#fdf2f8",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    short: "MKT",
    icon: "🛒",
    color: "#d97706",
    soft: "#fffbeb",
  },
  {
    id: "opportunity_hub",
    name: "Opportunity Hub",
    short: "OPP",
    icon: "🎯",
    color: "#059669",
    soft: "#ecfdf5",
  },
  {
    id: "club_management",
    name: "Club Management",
    short: "CLB",
    icon: "🏛️",
    color: "#4f46e5",
    soft: "#eef2ff",
  },
];

/**
 * Demo session: Trưởng ban Chuyên môn — giao task, duyệt, và có 1 task tự làm để nộp.
 * Chủ nhiệm/Admin vẫn test được “Nhắc duyệt” bằng cách đổi clubRole tạm — giữ thêm id owner ảo:
 * dùng clubRole Trưởng ban; canRemindReview cần Chủ nhiệm → đổi CURRENT_USER.clubRole khi cần.
 * Ở đây set Chủ nhiệm nhưng id = m-cm-tb để vừa duyệt (supervisor) vừa nhắc được.
 */
export const CURRENT_USER: CurrentUser = {
  id: "m-cm-tb",
  name: "Lan Hương",
  clubRole: "Chủ nhiệm",
  departmentId: "chuyen_mon",
};

export const MEMBERS: Member[] = [
  // Chuyên môn
  {
    id: "m-cm-tb",
    name: "Lan Hương",
    initials: "LH",
    departmentId: "chuyen_mon",
    role: "Trưởng ban",
  },
  {
    id: "m-cm-pb",
    name: "Quốc Bảo",
    initials: "QB",
    departmentId: "chuyen_mon",
    role: "Phó ban",
  },
  {
    id: "m-cm-1",
    name: "Minh Anh",
    initials: "MA",
    departmentId: "chuyen_mon",
    role: "Thành viên",
  },
  {
    id: "m-cm-2",
    name: "Thanh Trúc",
    initials: "TT",
    departmentId: "chuyen_mon",
    role: "Thành viên",
  },
  // Đối ngoại
  {
    id: "m-dn-tb",
    name: "Hoàng Nam",
    initials: "HN",
    departmentId: "doi_ngoai",
    role: "Trưởng ban",
  },
  {
    id: "m-dn-pb",
    name: "Mai Chi",
    initials: "MC",
    departmentId: "doi_ngoai",
    role: "Phó ban",
  },
  {
    id: "m-dn-1",
    name: "Gia Bảo",
    initials: "GB",
    departmentId: "doi_ngoai",
    role: "Thành viên",
  },
  // Kỹ thuật
  {
    id: "m-kt-tb",
    name: "Đức Huy",
    initials: "ĐH",
    departmentId: "ky_thuat",
    role: "Trưởng ban",
  },
  {
    id: "m-kt-1",
    name: "Ngọc Hà",
    initials: "NH",
    departmentId: "ky_thuat",
    role: "Thành viên",
  },
  {
    id: "m-kt-2",
    name: "Tuấn Kiệt",
    initials: "TK",
    departmentId: "ky_thuat",
    role: "Thành viên",
  },
  // Nhân sự
  {
    id: "m-ns-tb",
    name: "Thu Hà",
    initials: "TH",
    departmentId: "nhan_su",
    role: "Trưởng ban",
  },
  {
    id: "m-ns-pb",
    name: "Phương Anh",
    initials: "PA",
    departmentId: "nhan_su",
    role: "Phó ban",
  },
  {
    id: "m-ns-1",
    name: "Minh Đức",
    initials: "MĐ",
    departmentId: "nhan_su",
    role: "Thành viên",
  },
  // Truyền thông
  {
    id: "m-tt-tb",
    name: "Khánh Linh",
    initials: "KL",
    departmentId: "truyen_thong",
    role: "Trưởng ban",
  },
  {
    id: "m-tt-1",
    name: "Bảo Châu",
    initials: "BC",
    departmentId: "truyen_thong",
    role: "Thành viên",
  },
  {
    id: "m-tt-2",
    name: "An Nhiên",
    initials: "AN",
    departmentId: "truyen_thong",
    role: "Thành viên",
  },
  // Sự kiện
  {
    id: "m-sk-tb",
    name: "Quang Vinh",
    initials: "QV",
    departmentId: "su_kien",
    role: "Trưởng ban",
  },
  {
    id: "m-sk-pb",
    name: "Hồng Nhung",
    initials: "HN",
    departmentId: "su_kien",
    role: "Phó ban",
  },
  {
    id: "m-sk-1",
    name: "Đức Long",
    initials: "ĐL",
    departmentId: "su_kien",
    role: "Thành viên",
  },
];

function at(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function hist(
  id: string,
  type: HistoryType,
  actorId: string,
  days: number,
  hour: number,
  message: string,
) {
  return { id, type, actorId, at: at(days, hour), message };
}

/** ~19 tasks — đủ submitted / revision / redo / done + lịch sử */
export const INITIAL_TASKS: Task[] = [
  {
    id: "t01",
    branchId: "personal_finance",
    title: "Soạn tip ngân sách 50/30/20",
    assigneeId: "m-cm-1",
    supervisorId: "m-cm-tb",
    dueDate: at(-2, 17, 0),
    priority: "high",
    note: "Đăng fanpage",
    status: "doing",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h01a", "assigned", "m-cm-tb", -5, 9, "Giao task")],
  },
  {
    id: "t02",
    branchId: "personal_finance",
    title: "Checklist theo dõi chi tiêu tuần",
    assigneeId: "m-cm-tb",
    supervisorId: "m-cm-pb",
    dueDate: at(0, 18, 0),
    priority: "medium",
    note: "",
    status: "todo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h02a", "assigned", "m-cm-pb", -1, 10, "Giao task")],
  },
  {
    id: "t03",
    branchId: "personal_finance",
    title: "Báo cáo quỹ CLB tháng 8",
    assigneeId: "m-cm-1",
    supervisorId: "m-cm-tb",
    dueDate: at(-10, 18, 0),
    priority: "medium",
    note: "Đã gửi BCH",
    status: "done",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s03-1",
        submittedAt: at(-11, 16, 0),
        links: ["https://drive.google.com/file/d/demo-bao-cao"],
        files: [],
        note: "Báo cáo đầy đủ",
        isLate: false,
        lateLabel: null,
        review: {
          result: "approved",
          comment: "Ổn",
          reviewedBy: "m-cm-tb",
          reviewedAt: at(-10, 19, 0),
          newDueDate: null,
        },
      },
    ],
    history: [
      hist("h03a", "assigned", "m-cm-tb", -14, 9, "Giao task"),
      hist("h03b", "submitted", "m-cm-1", -11, 16, "Nộp lần 1"),
      hist("h03c", "approved", "m-cm-tb", -10, 19, "Duyệt hoàn thành"),
    ],
  },
  {
    id: "t04",
    branchId: "education_hub",
    title: "Slide workshop Vi tiền sinh viên",
    assigneeId: "m-cm-1",
    supervisorId: "m-cm-tb",
    dueDate: at(-1, 20, 0),
    priority: "high",
    note: "20 trang",
    status: "submitted",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s04-1",
        submittedAt: at(-1, 19, 30),
        links: ["https://www.canva.com/design/demo-slide"],
        files: [
          {
            id: "f04",
            name: "Workshop_v2.pptx",
            url: "https://example.com/workshop.pptx",
            type: "file",
          },
        ],
        note: "Đã thêm case SV năm nhất",
        isLate: false,
        lateLabel: null,
        review: null,
      },
    ],
    history: [
      hist("h04a", "assigned", "m-cm-tb", -4, 9, "Giao task"),
      hist("h04b", "submitted", "m-cm-1", -1, 19, "Nộp lần 1"),
    ],
  },
  {
    id: "t05",
    branchId: "education_hub",
    title: "FAQ tài chính cá nhân cho fanpage",
    assigneeId: "m-tt-1",
    supervisorId: "m-tt-tb",
    dueDate: at(1, 16, 30),
    priority: "medium",
    note: "10 câu",
    status: "revision",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s05-1",
        submittedAt: at(-2, 14, 0),
        links: ["https://docs.google.com/document/d/faq-draft"],
        files: [],
        note: "Draft 8/10 câu",
        isLate: false,
        lateLabel: null,
        review: {
          result: "revision",
          comment: "Bổ sung số liệu slide 5 và thêm 2 câu về tiết kiệm",
          reviewedBy: "m-tt-tb",
          reviewedAt: at(-1, 10, 0),
          newDueDate: at(1, 16, 30),
        },
      },
    ],
    history: [
      hist("h05a", "assigned", "m-tt-tb", -5, 9, "Giao task"),
      hist("h05b", "submitted", "m-tt-1", -2, 14, "Nộp lần 1"),
      hist(
        "h05c",
        "revision",
        "m-tt-tb",
        -1,
        10,
        "Yêu cầu chỉnh sửa — Bổ sung số liệu slide 5 và thêm 2 câu về tiết kiệm",
      ),
    ],
  },
  {
    id: "t06",
    branchId: "education_hub",
    title: "Quiz Knowledge Check #3",
    assigneeId: "m-cm-2",
    supervisorId: "m-cm-tb",
    dueDate: at(5, 14, 0),
    priority: "low",
    note: "",
    status: "todo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h06a", "assigned", "m-cm-tb", -1, 11, "Giao task")],
  },
  {
    id: "t07",
    branchId: "project_marketplace",
    title: "Update roadmap FinLab Q4",
    assigneeId: "m-kt-1",
    supervisorId: "m-kt-tb",
    dueDate: at(0, 21, 0),
    priority: "high",
    note: "Notion CLB",
    status: "doing",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h07a", "assigned", "m-kt-tb", -3, 9, "Giao task")],
  },
  {
    id: "t08",
    branchId: "project_marketplace",
    title: "Demo UI đăng ký dự án",
    assigneeId: "m-kt-2",
    supervisorId: "m-kt-tb",
    dueDate: at(4, 17, 0),
    priority: "medium",
    note: "",
    status: "redo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s08-1",
        submittedAt: at(-4, 12, 0),
        links: ["https://www.figma.com/file/demo-ui"],
        files: [
          {
            id: "f08",
            name: "ui-preview.png",
            url: "https://picsum.photos/seed/pfcui/640/360",
            type: "image",
          },
        ],
        note: "Bản prototype",
        isLate: false,
        lateLabel: null,
        review: {
          result: "redo",
          comment:
            "Flow đăng ký còn thiếu bước xác nhận email, làm lại từ wireframe",
          reviewedBy: "m-kt-tb",
          reviewedAt: at(-3, 18, 0),
          newDueDate: at(4, 17, 0),
        },
      },
    ],
    history: [
      hist("h08a", "assigned", "m-kt-tb", -7, 9, "Giao task"),
      hist("h08b", "submitted", "m-kt-2", -4, 12, "Nộp lần 1"),
      hist(
        "h08c",
        "redo",
        "m-kt-tb",
        -3,
        18,
        "Yêu cầu làm lại — Flow đăng ký còn thiếu bước xác nhận email",
      ),
    ],
  },
  {
    id: "t09",
    branchId: "project_marketplace",
    title: "Seed dữ liệu dự án mẫu",
    assigneeId: "m-kt-1",
    supervisorId: "m-kt-tb",
    dueDate: at(-6, 12, 0),
    priority: "low",
    note: "",
    status: "done",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s09-1",
        submittedAt: at(-7, 10, 0),
        links: ["https://github.com/demo/seed"],
        files: [],
        note: "",
        isLate: false,
        lateLabel: null,
        review: {
          result: "revision",
          comment: "Thêm 2 dự án lĩnh vực FinTech",
          reviewedBy: "m-kt-tb",
          reviewedAt: at(-6, 15, 0),
          newDueDate: null,
        },
      },
      {
        id: "s09-2",
        submittedAt: at(-6, 11, 0),
        links: ["https://github.com/demo/seed"],
        files: [],
        note: "Đã thêm 2 dự án",
        isLate: false,
        lateLabel: null,
        review: {
          result: "approved",
          comment: "",
          reviewedBy: "m-kt-tb",
          reviewedAt: at(-6, 12, 30),
          newDueDate: null,
        },
      },
    ],
    history: [
      hist("h09a", "assigned", "m-kt-tb", -10, 9, "Giao task"),
      hist("h09b", "submitted", "m-kt-1", -7, 10, "Nộp lần 1"),
      hist(
        "h09c",
        "revision",
        "m-kt-tb",
        -6,
        15,
        "Yêu cầu chỉnh sửa — Thêm 2 dự án lĩnh vực FinTech",
      ),
      hist("h09d", "submitted", "m-kt-1", -6, 11, "Nộp lần 2"),
      hist("h09e", "approved", "m-kt-tb", -6, 12, "Duyệt hoàn thành"),
    ],
  },
  {
    id: "t10",
    branchId: "marketplace",
    title: "Carousel tip tiết kiệm 7 ngày",
    assigneeId: "m-tt-2",
    supervisorId: "m-tt-tb",
    dueDate: at(-1, 9, 0),
    priority: "high",
    note: "",
    status: "submitted",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s10-1",
        submittedAt: at(-2, 22, 0),
        links: ["https://www.canva.com/design/carousel-7d"],
        files: [
          {
            id: "f10",
            name: "frame1.png",
            url: "https://picsum.photos/seed/pfcig/400/400",
            type: "image",
          },
        ],
        note: "Nộp muộn một chút",
        isLate: true,
        lateLabel: "Nộp trễ 13 giờ",
        review: null,
      },
    ],
    history: [
      hist("h10a", "assigned", "m-tt-tb", -5, 9, "Giao task"),
      hist(
        "h10b",
        "submitted",
        "m-tt-2",
        -2,
        22,
        "Nộp lần 1 · Nộp trễ 13 giờ",
      ),
    ],
  },
  {
    id: "t11",
    branchId: "marketplace",
    title: "Banner tuyển TV đợt 2",
    assigneeId: "m-tt-1",
    supervisorId: "m-tt-tb",
    dueDate: at(2, 15, 0),
    priority: "medium",
    note: "",
    status: "doing",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h11a", "assigned", "m-tt-tb", -2, 10, "Giao task")],
  },
  {
    id: "t12",
    branchId: "marketplace",
    title: "Clip recap Orientation",
    assigneeId: "m-tt-2",
    supervisorId: "m-tt-tb",
    dueDate: at(-8, 19, 0),
    priority: "low",
    note: "",
    status: "done",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s12-1",
        submittedAt: at(-9, 12, 0),
        links: ["https://drive.google.com/file/d/recap"],
        files: [],
        note: "",
        isLate: false,
        lateLabel: null,
        review: {
          result: "approved",
          comment: "Hay",
          reviewedBy: "m-tt-tb",
          reviewedAt: at(-8, 16, 0),
          newDueDate: null,
        },
      },
    ],
    history: [
      hist("h12a", "assigned", "m-tt-tb", -12, 9, "Giao task"),
      hist("h12b", "submitted", "m-tt-2", -9, 12, "Nộp lần 1"),
      hist("h12c", "approved", "m-tt-tb", -8, 16, "Duyệt hoàn thành"),
    ],
  },
  {
    id: "t13",
    branchId: "opportunity_hub",
    title: "Mail mời mentor doanh nghiệp",
    assigneeId: "m-dn-1",
    supervisorId: "m-dn-tb",
    dueDate: at(0, 18, 0),
    priority: "high",
    note: "",
    status: "doing",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h13a", "assigned", "m-dn-tb", -2, 9, "Giao task")],
  },
  {
    id: "t14",
    branchId: "opportunity_hub",
    title: "Danh sách internship thu 2026",
    assigneeId: "m-dn-1",
    supervisorId: "m-cm-tb",
    dueDate: at(-2, 10, 0),
    priority: "medium",
    note: "",
    status: "submitted",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s14-1",
        submittedAt: at(-3, 8, 0),
        links: ["https://docs.google.com/spreadsheets/d/intern"],
        files: [],
        note: "12 vị trí",
        isLate: false,
        lateLabel: null,
        review: null,
      },
    ],
    history: [
      hist("h14a", "assigned", "m-dn-tb", -6, 9, "Giao task"),
      hist("h14b", "submitted", "m-dn-1", -3, 8, "Nộp lần 1"),
    ],
  },
  {
    id: "t15",
    branchId: "opportunity_hub",
    title: "Verify 3 cơ hội đã publish",
    assigneeId: "m-dn-pb",
    supervisorId: "m-dn-tb",
    dueDate: at(8, 16, 0),
    priority: "low",
    note: "",
    status: "todo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h15a", "assigned", "m-dn-tb", 0, 9, "Giao task")],
  },
  {
    id: "t16",
    branchId: "club_management",
    title: "Xác nhận phòng workshop",
    assigneeId: "m-sk-1",
    supervisorId: "m-sk-tb",
    dueDate: at(-3, 14, 0),
    priority: "high",
    note: "",
    status: "doing",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h16a", "assigned", "m-sk-tb", -5, 9, "Giao task")],
  },
  {
    id: "t17",
    branchId: "club_management",
    title: "Onboarding 5 thành viên mới",
    assigneeId: "m-ns-1",
    supervisorId: "m-ns-tb",
    dueDate: at(1, 9, 30),
    priority: "medium",
    note: "",
    status: "todo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [hist("h17a", "assigned", "m-ns-tb", -1, 10, "Giao task")],
  },
  {
    id: "t18",
    branchId: "club_management",
    title: "Checklist check-in sự kiện",
    assigneeId: "m-sk-1",
    supervisorId: "m-cm-tb",
    dueDate: at(-1, 12, 0),
    priority: "medium",
    note: "",
    status: "submitted",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s18-1",
        submittedAt: at(-1, 11, 0),
        links: ["https://drive.google.com/file/d/checkin"],
        files: [],
        note: "QR + ca trực",
        isLate: false,
        lateLabel: null,
        review: null,
      },
    ],
    history: [
      hist("h18a", "assigned", "m-sk-tb", -4, 9, "Giao task"),
      hist("h18b", "submitted", "m-sk-1", -1, 11, "Nộp lần 1"),
    ],
  },
  {
    id: "t19",
    branchId: "club_management",
    title: "Cập nhật danh sách quyền ban",
    assigneeId: "m-ns-pb",
    supervisorId: "m-ns-tb",
    dueDate: at(-12, 17, 0),
    priority: "low",
    note: "",
    status: "done",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [
      {
        id: "s19-1",
        submittedAt: at(-13, 10, 0),
        links: ["https://docs.google.com/spreadsheets/d/roles"],
        files: [],
        note: "",
        isLate: false,
        lateLabel: null,
        review: {
          result: "approved",
          comment: "",
          reviewedBy: "m-ns-tb",
          reviewedAt: at(-12, 17, 0),
          newDueDate: null,
        },
      },
    ],
    history: [
      hist("h19a", "assigned", "m-ns-tb", -15, 9, "Giao task"),
      hist("h19b", "submitted", "m-ns-pb", -13, 10, "Nộp lần 1"),
      hist("h19c", "approved", "m-ns-tb", -12, 17, "Duyệt hoàn thành"),
    ],
  },
];


export function branchById(id: BranchId) {
  return BRANCHES.find((b) => b.id === id)!;
}

export function memberById(id: string) {
  return MEMBERS.find((m) => m.id === id);
}

export function departmentById(id: string) {
  return DEPARTMENTS.find((d) => d.id === id);
}

export function supervisors(): Member[] {
  return MEMBERS.filter((m) => m.role === "Trưởng ban" || m.role === "Phó ban");
}

export function defaultSupervisorForAssignee(assigneeId: string): string | null {
  const a = memberById(assigneeId);
  if (!a) return null;
  const same = MEMBERS.filter((m) => m.departmentId === a.departmentId);
  const head = same.find((m) => m.role === "Trưởng ban");
  if (head) return head.id;
  const vice = same.find((m) => m.role === "Phó ban");
  return vice?.id ?? null;
}
