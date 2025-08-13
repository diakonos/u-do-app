import { defineSchema, defineTable } from "convex/schema";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    taskName: v.string(),
    dueDate: v.optional(v.string()), // ISO date string
    isDone: v.boolean(),
    userId: v.string(),
    isPrivate: v.boolean(),
    assignedBy: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_assigned", ["assignedBy"]),

  userProfiles: defineTable({
    userId: v.string(),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_user_id", ["userId"])
    .index("by_username", ["username"]),

  friendRequests: defineTable({
    requesterId: v.string(),
    recipientId: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_requester", ["requesterId"])
    .index("by_recipient", ["recipientId"])
    .index("unique_request", ["requesterId", "recipientId"]),

  notifications: defineTable({
    targetUserId: v.string(),
    senderUserId: v.optional(v.string()),
    type: v.number(), // smallint in original schema
    deliveryStatus: v.number(), // smallint in original schema
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    readStatus: v.boolean(),
    createdAt: v.string(),
  }).index("by_target", ["targetUserId"]),

  notificationDeliveryStatuses: defineTable({
    status: v.string(),
  }),

  notificationTypes: defineTable({
    type: v.string(),
  }),
});
