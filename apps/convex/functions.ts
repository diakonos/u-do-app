import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Task Queries
export const getTasks = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .filter(q => q.eq(q.field("userId"), userId))
      .collect();
    return tasks;
  },
});

export const getFriendTasks = query({
  args: { friendId: v.string() },
  handler: async (ctx, { friendId }) => {
    // First verify they are friends by checking friendRequests
    const tasks = await ctx.db
      .query("tasks")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), friendId),
          q.eq(q.field("isPrivate"), false)
        )
      )
      .collect();
    return tasks;
  },
});

// Task Mutations
export const createTask = mutation({
  args: {
    taskName: v.string(),
    dueDate: v.optional(v.string()),
    userId: v.string(),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { taskName, dueDate, userId, isPrivate }) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("tasks", {
      taskName,
      dueDate,
      isDone: false,
      userId,
      isPrivate: isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    taskName: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    isDone: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Friend Request Queries
export const getFriendRequests = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const requests = await ctx.db
      .query("friendRequests")
      .filter(q => 
        q.or(
          q.eq(q.field("requesterId"), userId),
          q.eq(q.field("recipientId"), userId)
        )
      )
      .collect();
    return requests;
  },
});

// Friend Request Mutations
export const sendFriendRequest = mutation({
  args: {
    requesterId: v.string(),
    recipientId: v.string(),
  },
  handler: async (ctx, { requesterId, recipientId }) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("friendRequests", {
      requesterId,
      recipientId,
      status: "pending",
      createdAt: now,
    });
  },
});

export const respondToFriendRequest = mutation({
  args: {
    id: v.id("friendRequests"),
    status: v.union(v.literal("confirmed"), v.literal("rejected")),
  },
  handler: async (ctx, { id, status }) => {
    const request = await ctx.db.get(id);
    if (!request) throw new Error("Friend request not found");

    return await ctx.db.patch(id, {
      status,
      updatedAt: new Date().toISOString(),
    });
  },
});

// User Profile Queries
export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();
    return profile;
  },
});

export const searchUsers = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const users = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("username"), username))
      .collect();
    return users;
  },
});

// User Profile Mutations
export const createUserProfile = mutation({
  args: {
    userId: v.string(),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { userId, username, email }) => {
    return await ctx.db.insert("userProfiles", {
      userId,
      username,
      email,
    });
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { userId, username, email }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();
    
    if (!profile) throw new Error("Profile not found");
    
    const updates: Partial<Doc<"userProfiles">> = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    
    return await ctx.db.patch(profile._id, updates);
  },
});

// Notification Queries
export const getNotifications = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter(q => q.eq(q.field("targetUserId"), userId))
      .collect();
    return notifications;
  },
});

// Notification Mutations
export const createNotification = mutation({
  args: {
    targetUserId: v.string(),
    senderUserId: v.optional(v.string()),
    type: v.number(),
    deliveryStatus: v.number(),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      readStatus: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const markNotificationRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    return await ctx.db.patch(id, { readStatus: true });
  },
});

export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
