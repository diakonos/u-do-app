import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get friends for a user
export const getFriendsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) =>
        q.eq("user_id", args.userId).eq("status", "accepted"),
      )
      .collect();

    const friendIds = friendships.map((f) => f.friend_id);
    const friends = await Promise.all(friendIds.map((id) => ctx.db.get(id)));

    return friends.filter((friend) => friend !== null);
  },
});

// Query to list friend requests
export const listFriendRequests = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Get incoming requests (where current user is recipient)
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_recipient_status", (q) =>
        q.eq("recipient_id", userId).eq("status", "pending"),
      )
      .collect();

    // Get outgoing requests (where current user is requester)
    const sends = await ctx.db
      .query("friendRequests")
      .withIndex("by_requester_status", (q) =>
        q.eq("requester_id", userId).eq("status", "pending"),
      )
      .collect();

    // Load user records for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        // For incoming requests, load the requester's info
        const requesterUser = await ctx.db.get(request.requester_id);
        return {
          ...request,
          user: requesterUser,
          type: "incoming" as const,
        };
      }),
    );

    const sendsWithUsers = await Promise.all(
      sends.map(async (send) => {
        // For outgoing requests, load the recipient's info
        const recipientUser = await ctx.db.get(send.recipient_id);
        return {
          ...send,
          user: recipientUser,
          type: "outgoing" as const,
        };
      }),
    );

    return [...requestsWithUsers, ...sendsWithUsers];
  },
});

// Query to search users by username
export const searchUsersByUsername = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.query.length < 2) return [];

    const users = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.gte("username", args.query).lt("username", args.query + "\uffff"),
      )
      .filter((q) => q.neq(q.field("_id"), identity.subject))
      .take(10);

    return users;
  },
});

// Query to check if a user is pinned
export const isUserPinned = query({
  args: {
    userId: v.id("users"),
    friendUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const friend = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.friendUsername))
      .first();

    if (!friend) return false;

    const pinnedFriend = await ctx.db
      .query("pinnedFriends")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", friend._id),
      )
      .first();

    return !!pinnedFriend;
  },
});

// Query to get friend create tasks permission
export const getFriendCreateTasksPermission = query({
  args: {
    userId: v.id("users"),
    friendUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const permission = await ctx.db
      .query("friendPermissions")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    return permission?.can_create_tasks ?? false;
  },
});

// Mutation to send friend request
export const sendFriendRequest = mutation({
  args: {
    requesterId: v.id("users"),
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if request already exists
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_requester_recipient", (q) =>
        q
          .eq("requester_id", args.requesterId)
          .eq("recipient_id", args.recipientId),
      )
      .first();

    if (existingRequest) {
      throw new Error("Friend request already sent");
    }

    const requestId = await ctx.db.insert("friendRequests", {
      requester_id: args.requesterId,
      recipient_id: args.recipientId,
      status: "pending",
    });

    return requestId;
  },
});

// Mutation to accept friend request
export const acceptFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.recipient_id !== args.userId) {
      throw new Error("Invalid friend request");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "accepted",
    });

    // Create friendship entries for both users
    await ctx.db.insert("friendships", {
      user_id: request.requester_id,
      friend_id: request.recipient_id,
      status: "accepted",
    });

    await ctx.db.insert("friendships", {
      user_id: request.recipient_id,
      friend_id: request.requester_id,
      status: "accepted",
    });
  },
});

// Mutation to decline friend request
export const declineFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.recipient_id !== args.userId) {
      throw new Error("Invalid friend request");
    }

    await ctx.db.delete(args.requestId);
  },
});

// Mutation to withdraw friend request
export const withdrawFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.requester_id !== args.userId) {
      throw new Error("Invalid friend request");
    }

    await ctx.db.delete(args.requestId);
  },
});

// Mutation to pin friend
export const pinFriend = mutation({
  args: {
    userId: v.id("users"),
    friendUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const friend = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.friendUsername))
      .first();

    if (!friend) {
      throw new Error("Friend not found");
    }

    // Check if already pinned
    const existing = await ctx.db
      .query("pinnedFriends")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", friend._id),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("pinnedFriends", {
        user_id: args.userId,
        friend_id: friend._id,
      });
    }
  },
});

// Mutation to unpin friend
export const unpinFriend = mutation({
  args: {
    userId: v.id("users"),
    friendUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const friend = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.friendUsername))
      .first();

    if (!friend) {
      throw new Error("Friend not found");
    }

    const pinnedFriend = await ctx.db
      .query("pinnedFriends")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", friend._id),
      )
      .first();

    if (pinnedFriend) {
      await ctx.db.delete(pinnedFriend._id);
    }
  },
});

// Mutation to enable friend create tasks permission
export const enableFriendCreateTasksPermission = mutation({
  args: {
    userId: v.id("users"),
    friendUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("friendPermissions")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        can_create_tasks: true,
      });
    } else {
      await ctx.db.insert("friendPermissions", {
        user_id: args.userId,
        friend_id: args.friendUserId,
        can_create_tasks: true,
      });
    }
  },
});

// Mutation to disable friend create tasks permission
export const disableFriendCreateTasksPermission = mutation({
  args: {
    userId: v.id("users"),
    friendUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("friendPermissions")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        can_create_tasks: false,
      });
    }
  },
});

// Mutation to unfriend
export const unfriend = mutation({
  args: {
    userId: v.id("users"),
    friendUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Remove both friendship entries
    const friendship1 = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    const friendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.friendUserId).eq("friend_id", args.userId),
      )
      .first();

    if (friendship1) await ctx.db.delete(friendship1._id);
    if (friendship2) await ctx.db.delete(friendship2._id);

    // Remove any pinned friend entries
    const pinnedFriend = await ctx.db
      .query("pinnedFriends")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    if (pinnedFriend) await ctx.db.delete(pinnedFriend._id);

    // Remove permissions
    const permission = await ctx.db
      .query("friendPermissions")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", args.userId).eq("friend_id", args.friendUserId),
      )
      .first();

    if (permission) await ctx.db.delete(permission._id);
  },
});
