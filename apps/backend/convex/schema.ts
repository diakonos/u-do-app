import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema for the u-do application
export default defineSchema({
  // Better Auth tables are auto-generated

  // User table
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Tasks table
  tasks: defineTable({
    user_id: v.id("users"),
    task_name: v.string(),
    due_date: v.optional(v.number()),
    is_done: v.boolean(),
    is_private: v.boolean(),
    assigned_by: v.optional(v.id("users")),
    updated_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_due_date", ["user_id", "due_date"])
    .index("by_user_done", ["user_id", "is_done"])
    .index("by_assigned_by", ["assigned_by"]),

  // Friend requests table
  friendRequests: defineTable({
    requester_id: v.id("users"),
    recipient_id: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
  })
    .index("by_requester", ["requester_id"])
    .index("by_recipient", ["recipient_id"])
    .index("by_recipient_status", ["recipient_id", "status"])
    .index("by_requester_status", ["requester_id", "status"])
    .index("by_requester_recipient", ["requester_id", "recipient_id"]),

  // Friendships table
  friendships: defineTable({
    user_id: v.id("users"),
    friend_id: v.id("users"),
    status: v.union(v.literal("accepted")),
  })
    .index("by_user", ["user_id"])
    .index("by_friend", ["friend_id"])
    .index("by_user_status", ["user_id", "status"])
    .index("by_user_friend", ["user_id", "friend_id"]),

  // Pinned friends table
  pinnedFriends: defineTable({
    user_id: v.id("users"),
    friend_id: v.id("users"),
  })
    .index("by_user", ["user_id"])
    .index("by_user_friend", ["user_id", "friend_id"]),

  // Friend permissions table
  friendPermissions: defineTable({
    user_id: v.id("users"),
    friend_id: v.id("users"),
    can_create_tasks: v.boolean(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_friend", ["user_id", "friend_id"]),
});
