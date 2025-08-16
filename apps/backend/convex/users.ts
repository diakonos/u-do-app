import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get current user's username
export const getCurrentUsername = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db.get(identity.subject as Id<"users">);

    return user?.username;
  },
});

// Query to get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Query to get user by username
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

// Mutation to create or update user
export const createOrUpdateUser = mutation({
  args: {
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        username: args.username,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        username: args.username,
        updatedAt: Date.now(),
      });
      return userId;
    }
  },
});

// Mutation to update user profile
export const updateUsername = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("User not authenticated");

    await ctx.db.patch(identity.subject as Id<"users">, {
      name: args.name,
      username: args.username,
      updatedAt: Date.now(),
    });
  },
});

// Query to check if username is available
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    console.log("existingUser:", existingUser);

    return !existingUser;
  },
});
