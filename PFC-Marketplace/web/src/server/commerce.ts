import { prisma } from "@/lib/prisma";
import { commercePolicy, splitPayout } from "@/domain/commerce-policy";
import { assertListingTransition } from "@/domain/listing-status";
import { assertOrderTransition } from "@/domain/order-status";
import { assertPaymentTransition } from "@/domain/payment-status";
import { getPaymentGateway } from "@/payments";
import { writeAudit } from "@/lib/audit";
import { nanoid } from "nanoid";
import type { ListingType } from "@prisma/client";

export async function listPublished(type?: ListingType) {
  return prisma.mktListing.findMany({
    where: {
      status: "PUBLISHED",
      ...(type ? { type } : {}),
    },
    include: { seller: true },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getOpenCart(memberId: string) {
  let cart = await prisma.mktCart.findFirst({
    where: { memberId, status: "OPEN" },
    include: { items: { include: { listing: true } } },
  });
  if (!cart) {
    cart = await prisma.mktCart.create({
      data: { memberId, status: "OPEN" },
      include: { items: { include: { listing: true } } },
    });
  }
  return cart;
}

export async function addToCart(memberId: string, listingId: string, quantity: number) {
  if (quantity < 1) throw new Error("Quantity must be >= 1");
  const listing = await prisma.mktListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "PUBLISHED") throw new Error("Listing not available");
  if (listing.inventoryQty != null && quantity > listing.inventoryQty) {
    throw new Error("Not enough inventory");
  }
  const cart = await getOpenCart(memberId);
  const existing = cart.items.find((i) => i.listingId === listingId);
  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (listing.inventoryQty != null && nextQty > listing.inventoryQty) {
      throw new Error("Not enough inventory");
    }
    await prisma.mktCartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.mktCartItem.create({
      data: { cartId: cart.id, listingId, quantity },
    });
  }
  return getOpenCart(memberId);
}

export async function checkoutCart(memberId: string, idempotencyKey: string) {
  const existing = await prisma.mktOrder.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const cart = await getOpenCart(memberId);
  if (!cart.items.length) throw new Error("Cart is empty");

  for (const item of cart.items) {
    if (item.listing.status !== "PUBLISHED") throw new Error(`Item unavailable: ${item.listing.title}`);
    if (item.listing.inventoryQty != null && item.quantity > item.listing.inventoryQty) {
      throw new Error(`Insufficient stock: ${item.listing.title}`);
    }
  }

  const sellerId = cart.items[0].listing.sellerId;
  if (cart.items.some((i) => i.listing.sellerId !== sellerId)) {
    throw new Error("P0 checkout supports one seller per order — tách seller khác sang lần sau");
  }

  const totalVnd = cart.items.reduce((sum, i) => sum + i.listing.priceVnd * i.quantity, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.mktOrder.create({
      data: {
        buyerId: memberId,
        sellerId,
        status: "PENDING_PAYMENT",
        totalVnd,
        commissionBpsApplied: commercePolicy.commissionBps,
        currency: commercePolicy.currency,
        idempotencyKey,
        items: {
          create: cart.items.map((i) => ({
            listingId: i.listingId,
            title: i.listing.title,
            unitPriceVnd: i.listing.priceVnd,
            quantity: i.quantity,
          })),
        },
      },
    });

    for (const item of cart.items) {
      if (item.listing.inventoryQty != null) {
        const updated = await tx.mktListing.updateMany({
          where: {
            id: item.listingId,
            inventoryQty: { gte: item.quantity },
          },
          data: { inventoryQty: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Stock race: ${item.listing.title}`);
      }
    }

    await tx.mktCart.update({
      where: { id: cart.id },
      data: { status: "CHECKED_OUT" },
    });
    await tx.mktCart.create({ data: { memberId, status: "OPEN" } });

    return created;
  });

  await writeAudit({
    actorId: memberId,
    action: "order.created",
    entity: "order",
    entityId: order.id,
    meta: { totalVnd, idempotencyKey },
  });

  return order;
}

export async function initiatePayment(orderId: string, memberId: string, returnUrl: string) {
  const order = await prisma.mktOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== memberId) throw new Error("Order not found");
  if (order.status !== "PENDING_PAYMENT") throw new Error("Order not payable");

  const gateway = getPaymentGateway();
  const idempotencyKey = `pay_${order.id}_${nanoid(8)}`;

  const payment = await prisma.mktPayment.create({
    data: {
      orderId: order.id,
      provider: gateway.name,
      status: "INITIATED",
      amountVnd: order.totalVnd,
      idempotencyKey,
    },
  });

  const created = await gateway.createPayment({
    orderId: order.id,
    amountVnd: order.totalVnd,
    idempotencyKey,
    returnUrl,
  });

  assertPaymentTransition("INITIATED", "PENDING");
  await prisma.mktPayment.update({
    where: { id: payment.id },
    data: { status: "PENDING", providerRef: created.providerRef },
  });

  await writeAudit({
    actorId: memberId,
    action: "payment.initiated",
    entity: "payment",
    entityId: payment.id,
    meta: { provider: gateway.name, providerRef: created.providerRef },
  });

  return { paymentId: payment.id, redirectUrl: created.redirectUrl, provider: gateway.name };
}

export async function completePaymentFromCallback(params: Record<string, string>) {
  const gateway = getPaymentGateway();
  const parsed = await gateway.parseCallback(params);

  const payment = await prisma.mktPayment.findFirst({
    where: { providerRef: parsed.providerRef, provider: gateway.name },
    include: { order: true },
  });
  if (!payment) throw new Error("Payment not found");

  if (payment.status === "SUCCESS") {
    return { order: payment.order, payment, duplicate: true };
  }

  if (parsed.amountVnd && parsed.amountVnd !== payment.amountVnd) {
    throw new Error("Amount mismatch");
  }

  if (!parsed.success) {
    assertPaymentTransition(payment.status, "FAILED");
    await prisma.mktPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    await writeAudit({
      action: "payment.failed",
      entity: "payment",
      entityId: payment.id,
    });
    return { order: payment.order, payment: { ...payment, status: "FAILED" as const }, duplicate: false };
  }

  const result = await prisma.$transaction(async (tx) => {
    assertPaymentTransition(payment.status, "SUCCESS");
    const pay = await tx.mktPayment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS" },
    });

    assertOrderTransition(payment.order.status, "PAID");
    let order = await tx.mktOrder.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });

    assertOrderTransition("PAID", "PROCESSING");
    order = await tx.mktOrder.update({
      where: { id: order.id },
      data: { status: "PROCESSING" },
    });

    // Digital auto-complete (provisional policy)
    const items = await tx.mktOrderItem.findMany({
      where: { orderId: order.id },
      include: { listing: true },
    });
    const allDigital = items.every((i) => i.listing?.type === "DIGITAL");
    if (allDigital) {
      assertOrderTransition("PROCESSING", "COMPLETED");
      order = await tx.mktOrder.update({
        where: { id: order.id },
        data: { status: "COMPLETED" },
      });
    }

    const { commissionVnd, netVnd } = splitPayout(order.totalVnd, order.commissionBpsApplied);
    await tx.mktPayoutRecord.upsert({
      where: { orderId: order.id },
      create: {
        sellerId: order.sellerId,
        orderId: order.id,
        grossVnd: order.totalVnd,
        commissionVnd,
        netVnd,
        status: "PENDING",
      },
      update: {},
    });

    return { order, payment: pay };
  });

  await writeAudit({
    action: "payment.succeeded",
    entity: "payment",
    entityId: payment.id,
    meta: { orderId: payment.orderId },
  });

  return { ...result, duplicate: false };
}

export async function submitListing(listingId: string, sellerMemberId: string) {
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: sellerMemberId } });
  if (!seller) throw new Error("Not a seller");
  const listing = await prisma.mktListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== seller.id) throw new Error("Listing not found");
  assertListingTransition(listing.status, "PENDING");
  const updated = await prisma.mktListing.update({
    where: { id: listingId },
    data: { status: "PENDING" },
  });
  await writeAudit({
    actorId: sellerMemberId,
    action: "listing.submitted",
    entity: "listing",
    entityId: listingId,
  });
  return updated;
}

export async function publishListing(listingId: string, adminId: string) {
  const listing = await prisma.mktListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  assertListingTransition(listing.status, "PUBLISHED");
  const updated = await prisma.mktListing.update({
    where: { id: listingId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await writeAudit({
    actorId: adminId,
    action: "listing.published",
    entity: "listing",
    entityId: listingId,
  });
  return updated;
}

export async function createListing(
  sellerMemberId: string,
  input: {
    type: ListingType;
    title: string;
    summary?: string;
    description: string;
    priceVnd: number;
    inventoryQty?: number | null;
    deliveryMeta?: string;
    serviceMeta?: string;
  },
) {
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: sellerMemberId } });
  if (!seller) throw new Error("Not a seller");
  if (input.priceVnd < 0) throw new Error("Invalid price");
  const listing = await prisma.mktListing.create({
    data: {
      sellerId: seller.id,
      type: input.type,
      title: input.title,
      summary: input.summary,
      description: input.description,
      priceVnd: input.priceVnd,
      inventoryQty: input.inventoryQty ?? null,
      deliveryMeta: input.deliveryMeta,
      serviceMeta: input.serviceMeta,
      status: "DRAFT",
    },
  });
  await writeAudit({
    actorId: sellerMemberId,
    action: "listing.created",
    entity: "listing",
    entityId: listing.id,
  });
  return listing;
}

export async function markOrderCompleted(
  orderId: string,
  actorId: string,
  opts: { asSeller?: boolean; asAdmin?: boolean } = {},
) {
  const order = await prisma.mktOrder.findUnique({
    where: { id: orderId },
    include: { seller: true },
  });
  if (!order) throw new Error("Order not found");
  const allowed =
    opts.asAdmin || (opts.asSeller && order.seller.memberId === actorId);
  if (!allowed) throw new Error("Forbidden");
  assertOrderTransition(order.status, "COMPLETED");
  const updated = await prisma.mktOrder.update({
    where: { id: orderId },
    data: { status: "COMPLETED" },
  });
  await writeAudit({
    actorId,
    action: "order.completed",
    entity: "order",
    entityId: orderId,
  });
  return updated;
}

export async function addReview(memberId: string, orderId: string, rating: number, body?: string) {
  if (rating < 1 || rating > 5) throw new Error("Rating 1–5");
  const order = await prisma.mktOrder.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== memberId) throw new Error("Order not found");
  if (order.status !== commercePolicy.reviewAfterOrderStatus) {
    throw new Error("Review not eligible yet");
  }
  return prisma.mktReview.create({
    data: { orderId, memberId, rating, body },
  });
}
