// convex/import.ts
import { v } from "convex/values";
import { mutation, httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ----------------------
// Internal mutations
// ----------------------

export const upsertUsers = mutation({
  args: {
    users: v.array(
      v.object({
        externalId: v.string(), // Supabase UUID
        email: v.string(),
        name: v.optional(v.string()),
        username: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const mapping: Record<string, Id<"users">> = {};

    for (const u of args.users) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", u.email))
        .first();

      let id: Id<"users">;
      if (existing) {
        await ctx.db.patch(existing._id, {
          email: u.email,
          name: u.name ?? existing.name,
          username: u.username ?? existing.username,
          updatedAt: u.updatedAt ?? existing.updatedAt ?? Date.now(),
        });
        id = existing._id;
      } else {
        id = await ctx.db.insert("users", {
          email: u.email,
          name: u.name,
          username: u.username,
          updatedAt: u.updatedAt ?? Date.now(),
        });
      }
      mapping[u.externalId] = id;
    }

    return mapping;
  },
});

export const upsertTasks = mutation({
  args: {
    tasks: v.array(
      v.object({
        userId: v.id("users"),
        taskName: v.string(),
        dueDate: v.optional(v.number()),
        isDone: v.boolean(),
        isPrivate: v.boolean(),
        assignedBy: v.optional(v.id("users")),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const t of args.tasks) {
      await ctx.db.insert("tasks", {
        user_id: t.userId,
        task_name: t.taskName,
        due_date: t.dueDate,
        is_done: t.isDone,
        is_private: t.isPrivate,
        assigned_by: t.assignedBy,
        updated_at: t.updatedAt,
      });
    }
  },
});

export const upsertFriendRequests = mutation({
  args: {
    friendRequests: v.array(
      v.object({
        requesterId: v.id("users"),
        recipientId: v.id("users"),
        status: v.union(
          v.literal("pending"),
          v.literal("accepted"),
          v.literal("declined"),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const fr of args.friendRequests) {
      const existing = await ctx.db
        .query("friendRequests")
        .withIndex("by_requester_recipient", (q) =>
          q
            .eq("requester_id", fr.requesterId)
            .eq("recipient_id", fr.recipientId),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { status: fr.status });
      } else {
        await ctx.db.insert("friendRequests", {
          requester_id: fr.requesterId,
          recipient_id: fr.recipientId,
          status: fr.status,
        });
      }
    }
  },
});

export const upsertFriendships = mutation({
  args: {
    friendships: v.array(
      v.object({
        userId: v.id("users"),
        friendId: v.id("users"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const f of args.friendships) {
      const existing = await ctx.db
        .query("friendships")
        .withIndex("by_user_friend", (q) =>
          q.eq("user_id", f.userId).eq("friend_id", f.friendId),
        )
        .first();
      if (!existing) {
        await ctx.db.insert("friendships", {
          user_id: f.userId,
          friend_id: f.friendId,
          status: "accepted",
        });
      }
    }
  },
});

export const upsertPinnedFriends = mutation({
  args: {
    pinned: v.array(
      v.object({
        userId: v.id("users"),
        friendId: v.id("users"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const p of args.pinned) {
      const existing = await ctx.db
        .query("pinnedFriends")
        .withIndex("by_user_friend", (q) =>
          q.eq("user_id", p.userId).eq("friend_id", p.friendId),
        )
        .first();
      if (!existing) {
        await ctx.db.insert("pinnedFriends", {
          user_id: p.userId,
          friend_id: p.friendId,
        });
      }
    }
  },
});

export const upsertFriendPermissions = mutation({
  args: {
    perms: v.array(
      v.object({
        userId: v.id("users"),
        friendId: v.id("users"),
        canCreateTasks: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const fp of args.perms) {
      const existing = await ctx.db
        .query("friendPermissions")
        .withIndex("by_user_friend", (q) =>
          q.eq("user_id", fp.userId).eq("friend_id", fp.friendId),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          can_create_tasks: fp.canCreateTasks,
        });
      } else {
        await ctx.db.insert("friendPermissions", {
          user_id: fp.userId,
          friend_id: fp.friendId,
          can_create_tasks: fp.canCreateTasks,
        });
      }
    }
  },
});

// ----------------------
// HTTP endpoints (for Node script)
// Requires MIGRATION_SECRET
// ----------------------

function authz(request: Request, secret: string | undefined) {
  const header = request.headers.get("authorization");
  const expected = secret ? `Bearer ${secret}` : undefined;
  if (!secret || header !== expected) {
    return false;
  }
  return true;
}

export const migrateUsersHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    users: Array<{
      externalId: string;
      email: string;
      name?: string;
      username?: string;
      updatedAt?: number;
    }>;
  };
  const mapping = await ctx.runMutation(api.import.upsertUsers, {
    users: body.users,
  });
  return new Response(JSON.stringify(mapping), {
    headers: { "Content-Type": "application/json" },
  });
});

export const migrateTasksHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    tasks: Array<{
      userId: Id<"users"> | string;
      taskName: string;
      dueDate?: number;
      isDone: boolean;
      isPrivate: boolean;
      assignedBy?: Id<"users"> | string;
      updatedAt: number;
    }>;
  };
  await ctx.runMutation(api.import.upsertTasks, {
    tasks: body.tasks as any,
  });
  return new Response("OK");
});

export const migrateFriendRequestsHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    friendRequests: Array<{
      requesterId: Id<"users"> | string;
      recipientId: Id<"users"> | string;
      status: "pending" | "accepted" | "declined";
    }>;
  };
  await ctx.runMutation(api.import.upsertFriendRequests, {
    friendRequests: body.friendRequests as any,
  });
  return new Response("OK");
});

export const migrateFriendshipsHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    friendships: Array<{ userId: Id<"users"> | string; friendId: string }>;
  };
  await ctx.runMutation(api.import.upsertFriendships, {
    friendships: body.friendships as any,
  });
  return new Response("OK");
});

export const migratePinnedFriendsHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    pinned: Array<{ userId: Id<"users"> | string; friendId: string }>;
  };
  await ctx.runMutation(api.import.upsertPinnedFriends, {
    pinned: body.pinned as any,
  });
  return new Response("OK");
});

export const migrateFriendPermissionsHttp = httpAction(async (ctx, req) => {
  if (!authz(req, process.env.MIGRATION_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as {
    perms: Array<{
      userId: Id<"users"> | string;
      friendId: Id<"users"> | string;
      canCreateTasks: boolean;
    }>;
  };
  await ctx.runMutation(api.import.upsertFriendPermissions, {
    perms: body.perms as any,
  });
  return new Response("OK");
});
