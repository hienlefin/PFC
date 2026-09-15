import { PrismaClient, ListingStatus, ListingType, SellerTier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.mktAuditEvent.deleteMany();
  await prisma.mktReview.deleteMany();
  await prisma.mktPayoutRecord.deleteMany();
  await prisma.mktPayment.deleteMany();
  await prisma.mktOrderItem.deleteMany();
  await prisma.mktOrder.deleteMany();
  await prisma.mktCartItem.deleteMany();
  await prisma.mktCart.deleteMany();
  await prisma.mktListing.deleteMany();
  await prisma.mktSellerProfile.deleteMany();
  await prisma.mktSession.deleteMany();
  await prisma.member.deleteMany();

  const buyer = await prisma.member.create({
    data: {
      name: "Nguyen Buyer",
      email: "buyer@pfc.vn",
      passwordHash: bcrypt.hashSync("Buyer-PFC-2026", 12),
      role: "BUYER",
    },
  });

  const sellerMember = await prisma.member.create({
    data: {
      name: "Tran Seller",
      email: "seller@pfc.vn",
      passwordHash: bcrypt.hashSync("Seller-PFC-2026", 12),
      role: "SELLER",
    },
  });

  await prisma.member.create({
    data: {
      name: "PFC Admin",
      email: "admin@pfc.vn",
      passwordHash: bcrypt.hashSync("Admin-PFC-2026", 12),
      role: "ADMIN",
    },
  });

  const seller = await prisma.mktSellerProfile.create({
    data: {
      memberId: sellerMember.id,
      displayName: "Nhà xuất bản PFC",
      verificationTier: SellerTier.VERIFIED,
      payoutEligible: true,
      bankAccountHint: "VCB **** 1234",
    },
  });

  const listings = [
    {
      type: ListingType.COURSE,
      title: "Khóa học Quản lý tài chính cá nhân",
      summary: "8 buổi · livestream + bài tập",
      description:
        "Khóa học giúp bạn lập ngân sách, kiểm soát chi tiêu và xây quỹ khẩn cấp trong 8 tuần cùng mentor PFC.",
      priceVnd: 299000,
      compareAtVnd: 399000,
      inventoryQty: null,
      deliveryMeta: "Truy cập ngay sau thanh toán",
      ratingAvg: 4.8,
      ratingCount: 320,
      coverTone: "violet",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.PHYSICAL,
      title: "Sách Tư duy tài chính",
      summary: "Nhà xuất bản PFC",
      description:
        "Cuốn sách giúp bạn xây dựng tư duy tài chính vững chắc: tiêu / tiết kiệm / đầu tư theo giai đoạn cuộc đời sinh viên và người đi làm sớm.",
      priceVnd: 189000,
      compareAtVnd: 250000,
      inventoryQty: 48,
      deliveryMeta: "Giao 2-3 ngày",
      serviceMeta: "Sách giấy",
      ratingAvg: 4.7,
      ratingCount: 156,
      coverTone: "indigo",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.SERVICE,
      title: "Tư vấn lập ngân sách 45 phút",
      summary: "1:1 với mentor PFC",
      description: "Buổi tư vấn online: map dòng tiền, ưu tiên nợ, mục tiêu 3 tháng.",
      priceVnd: 199000,
      compareAtVnd: null,
      inventoryQty: 20,
      serviceMeta: "Zoom · đặt lịch trong 7 ngày",
      deliveryMeta: "Online",
      ratingAvg: 4.9,
      ratingCount: 84,
      coverTone: "plum",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.DIGITAL,
      title: "Template ngân sách Google Sheet",
      summary: "File số tải ngay sau thanh toán",
      description: "Bộ template theo dõi thu/chi + quỹ khẩn cấp.",
      priceVnd: 49000,
      compareAtVnd: 79000,
      inventoryQty: null,
      deliveryMeta: "Download link sau khi hoàn tất",
      ratingAvg: 4.6,
      ratingCount: 210,
      coverTone: "lilac",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.EVENT_TICKET,
      title: "Workshop PFC Open Day",
      summary: "Vé tham dự sự kiện cộng đồng",
      description: "Một ngày workshop tài chính cá nhân cùng cộng đồng PFC.",
      priceVnd: 99000,
      compareAtVnd: null,
      inventoryQty: 100,
      deliveryMeta: "E-ticket",
      externalRefType: "SharedEvent",
      externalRefId: "evt_demo_open_day",
      ratingAvg: 4.5,
      ratingCount: 64,
      coverTone: "berry",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.PHYSICAL,
      title: "Áo thun PFC Community",
      summary: "Draft — chờ duyệt",
      description: "Áo cotton form rộng, in logo PFC.",
      priceVnd: 159000,
      inventoryQty: 100,
      deliveryMeta: "Size S–XL",
      ratingAvg: 0,
      ratingCount: 0,
      coverTone: "violet",
      status: ListingStatus.PENDING,
    },
  ];

  for (const row of listings) {
    await prisma.mktListing.create({
      data: { ...row, sellerId: seller.id },
    });
  }

  await prisma.mktCart.create({
    data: { memberId: buyer.id, status: "OPEN" },
  });

  console.log("Marketplace DB seeded with mockup-aligned catalog");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
