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
      displayName: "PFC Campus Store",
      verificationTier: SellerTier.VERIFIED,
      payoutEligible: true,
      bankAccountHint: "VCB **** 1234",
    },
  });

  const listings = [
    {
      type: ListingType.PHYSICAL,
      title: "Sổ kế hoạch tài chính PFC",
      summary: "Planner in giấy cho sinh viên",
      description: "Sổ tay 120 trang: ngân sách tháng, mục tiêu tiết kiệm, checklist chi tiêu.",
      priceVnd: 89000,
      inventoryQty: 50,
      deliveryMeta: "Ship nội thành 2–4 ngày",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.DIGITAL,
      title: "Template ngân sách Google Sheet",
      summary: "File số tải ngay sau thanh toán",
      description: "Bộ template theo dõi thu/chi + quỹ khẩn cấp. Giao hàng digital.",
      priceVnd: 49000,
      inventoryQty: null,
      deliveryMeta: "Download link sau khi order COMPLETED",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      type: ListingType.SERVICE,
      title: "Tư vấn lập ngân sách 45 phút",
      summary: "1:1 với mentor PFC",
      description: "Buổi tư vấn online: map dòng tiền, ưu tiên nợ, mục tiêu 3 tháng.",
      priceVnd: 199000,
      inventoryQty: 20,
      serviceMeta: "Zoom · đặt lịch trong 7 ngày sau thanh toán",
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

  console.log("Marketplace DB seeded (buyer / seller / admin + 3 published listings)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
