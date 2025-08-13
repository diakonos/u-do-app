import { customQuery, customCtx } from "convex-helpers/server/customFunctions";
import { query } from "../convex/_generated/server";
import { createAuth } from "../lib/auth";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const betterAuth = createAuth(ctx);
    return {
      ...ctx,
      betterAuth,
    };
  }),
);

export const friendQuery = customQuery(query, {
  args: { friendId: v.id("users") },
  input: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const currentUserId = identity.subject as Id<"users">;

    // Ensure the current user and friendId are actually friends.
    // According to schema, friendships are stored bidirectionally and
    // an entry existing implies status "accepted".
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("user_id", currentUserId).eq("friend_id", args.friendId),
      )
      .first();

    if (!friendship) {
      throw new Error("Forbidden: not friends");
    }
    const betterAuth = createAuth(ctx);
    return {
      ctx: {
        ...ctx,
        betterAuth,
      },
      args,
    };
  },
});
