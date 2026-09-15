import { PrismaClient, OpportunityType, ApplyMode, WorkMode, EmploymentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hash(plain: string) {
  return bcrypt.hashSync(plain, 12);
}

async function main() {
  await prisma.oppApplicationEvent.deleteMany();
  await prisma.oppAttachment.deleteMany();
  await prisma.oppDelivery.deleteMany();
  await prisma.oppApplication.deleteMany();
  await prisma.oppSavedOpportunity.deleteMany();
  await prisma.oppVerificationDecision.deleteMany();
  await prisma.oppReminderLog.deleteMany();
  await prisma.oppReminderPreference.deleteMany();
  await prisma.oppNotification.deleteMany();
  await prisma.oppSession.deleteMany();
  await prisma.oppOpportunity.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.member.deleteMany();

  const member = await prisma.member.create({
    data: {
      id: "member_demo_linh",
      name: "Nguyễn Phương Linh",
      email: "phuonglinh@pfc.vn",
      passwordHash: hash("Linh-PFC-2026"),
      role: "MEMBER",
    },
  });

  const providerMember = await prisma.member.create({
    data: {
      id: "member_demo_provider",
      name: "Trần Quang Minh",
      email: "provider@pfc.vn",
      passwordHash: hash("Provider-PFC-2026"),
      role: "PROVIDER",
    },
  });

  await prisma.member.create({
    data: {
      id: "member_demo_reviewer",
      name: "PFC Reviewer",
      email: "reviewer@pfc.vn",
      passwordHash: hash("Reviewer-PFC-2026"),
      role: "REVIEWER",
    },
  });

  const provider = await prisma.providerProfile.create({
    data: {
      id: "provider_vcb",
      memberId: providerMember.id,
      displayName: "Vietcombank Talent",
      verificationTier: "TRUSTED_PARTNER",
    },
  });

  const provider2 = await prisma.providerProfile.create({
    data: {
      id: "provider_pfc",
      memberId: providerMember.id,
      displayName: "PFC Partners",
      verificationTier: "VERIFIED_PROVIDER",
    },
  });

  const days = (n: number) => new Date(Date.now() + n * 86400000);

  const items: Array<{
    type: OpportunityType;
    title: string;
    summary: string;
    description: string;
    locationText: string;
    workMode: WorkMode;
    employmentType?: EmploymentType;
    deadlineAt: Date;
    applyMode: ApplyMode;
    externalUrl?: string;
    providerId: string;
  }> = [
    {
      type: "INTERNSHIP",
      title: "Financial Analysis Internship",
      summary: "Thực tập phân tích tài chính tại Vietcombank",
      description:
        "Hỗ trợ phân tích báo cáo tài chính, xây dựng mô hình đơn giản và tham gia dự án nội bộ. Mentorship 1-1 hàng tuần.",
      locationText: "Hồ Chí Minh",
      workMode: "HYBRID",
      employmentType: "FULL_TIME",
      deadlineAt: days(12),
      applyMode: "BOTH",
      externalUrl: "https://www.vietcombank.com.vn/vn/careers",
      providerId: provider.id,
    },
    {
      type: "JOB",
      title: "Junior Product Analyst (Part-time)",
      summary: "CTV/Part-time phân tích sản phẩm fintech",
      description: "Làm việc với đội Product PFC Partner, theo dõi funnel và đề xuất cải tiến.",
      locationText: "Hà Nội",
      workMode: "REMOTE",
      employmentType: "PART_TIME",
      deadlineAt: days(20),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/jobs/junior-product-analyst",
      providerId: provider2.id,
    },
    {
      type: "JOB",
      title: "Community Operations CTV",
      summary: "Hỗ trợ vận hành cộng đồng PFC",
      description: "Quản lý lịch sự kiện, moderation cơ bản và báo cáo tuần.",
      locationText: "Đà Nẵng",
      workMode: "ONSITE",
      employmentType: "CTV",
      deadlineAt: days(8),
      applyMode: "INTERNAL",
      providerId: provider2.id,
    },
    {
      type: "SCHOLARSHIP",
      title: "PFC Young Leaders Scholarship 2026",
      summary: "Học bổng phát triển lãnh đạo tài chính cá nhân",
      description: "Hỗ trợ học phí + mentoring 6 tháng. Yêu cầu bài luận 800 từ.",
      locationText: "Toàn quốc",
      workMode: "REMOTE",
      deadlineAt: days(5),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/scholarship/pfc-2026",
      providerId: provider2.id,
    },
    {
      type: "COMPETITION",
      title: "FinLit Case Competition",
      summary: "Cuộc thi case tài chính cá nhân",
      description: "Đội 3–4 người, vòng online + chung kết HCM. Giải thưởng 50 triệu.",
      locationText: "Hồ Chí Minh",
      workMode: "HYBRID",
      deadlineAt: days(3),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/competitions/finlit",
      providerId: provider.id,
    },
    {
      type: "INTERNSHIP",
      title: "UI/UX Intern — EdTech",
      summary: "Thực tập thiết kế trải nghiệm học tập",
      description: "Thiết kế flow khóa học, prototype Figma, usability test với học viên.",
      locationText: "Remote",
      workMode: "REMOTE",
      employmentType: "FULL_TIME",
      deadlineAt: days(25),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/intern/uiux",
      providerId: provider2.id,
    },
    {
      type: "SCHOLARSHIP",
      title: "Women in Finance Grant",
      summary: "Tài trợ khóa học đầu tư cơ bản",
      description: "Dành cho nữ sinh viên năm 2–4. Bao gồm voucher khóa học + cộng đồng mentor.",
      locationText: "Toàn quốc",
      workMode: "REMOTE",
      deadlineAt: days(15),
      applyMode: "BOTH",
      externalUrl: "https://example.com/grants/wif",
      providerId: provider.id,
    },
    {
      type: "COMPETITION",
      title: "Hackathon Personal Finance Tools",
      summary: "48h xây tool quản lý chi tiêu",
      description: "Open track: web/mobile. Mentors từ PFC Club. Top 5 vào incubator.",
      locationText: "Hà Nội",
      workMode: "ONSITE",
      deadlineAt: days(2),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/hackathon/pfc-tools",
      providerId: provider2.id,
    },
    {
      type: "JOB",
      title: "Full-time Risk Analyst Trainee",
      summary: "Chương trình trainee rủi ro tín dụng",
      description: "Đào tạo 3 tháng + rotation chính thức. Yêu cầu Excel/SQL cơ bản.",
      locationText: "Hồ Chí Minh",
      workMode: "ONSITE",
      employmentType: "FULL_TIME",
      deadlineAt: days(30),
      applyMode: "EXTERNAL",
      externalUrl: "https://example.com/jobs/risk-trainee",
      providerId: provider.id,
    },
    {
      type: "INTERNSHIP",
      title: "Content Intern — Personal Finance",
      summary: "Viết bài giáo dục tài chính",
      description: "Nghiên cứu chủ đề, draft bài, phối hợp designer. Portfolio là lợi thế.",
      locationText: "Remote",
      workMode: "REMOTE",
      employmentType: "PART_TIME",
      deadlineAt: days(18),
      applyMode: "INTERNAL",
      providerId: provider2.id,
    },
  ];

  for (const item of items) {
    await prisma.oppOpportunity.create({
      data: {
        ...item,
        status: "VERIFIED",
        publishedAt: new Date(),
        expireAt: item.deadlineAt,
        requirements: "Sinh viên/người trẻ quan tâm tài chính cá nhân. CV tiếng Việt hoặc Anh.",
        benefits: "Mentorship · Certificate · Networking PFC",
      },
    });
  }

  // Draft (must NOT appear in public catalog)
  await prisma.oppOpportunity.create({
    data: {
      providerId: provider2.id,
      type: "JOB",
      title: "DRAFT — Internal only",
      description: "Should never be public",
      status: "DRAFT",
      applyMode: "INTERNAL",
      workMode: "REMOTE",
    },
  });

  console.log("Seeded member", member.id, "and", items.length, "verified opportunities");

  await prisma.oppReminderPreference.create({
    data: { memberId: member.id, enabled: true, inApp: true, email: true, push: true },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
