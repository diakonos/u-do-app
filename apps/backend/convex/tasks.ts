import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Query to get dashboard friend tasks (pinned friends' tasks due today)
export const getDashboardFriendTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Find pinned friends for the user
    const pinned = await ctx.db
      .query("pinnedFriends")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    if (pinned.length === 0) return [] as Array<any>;

    const friendIds = pinned.map((p) => p.friend_id);

    // Load friend user docs to get usernames
    const friendUsers = await Promise.all(
      friendIds.map((id) => ctx.db.get(id)),
    );
    const friendIdToUsername = new Map(
      friendUsers
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, u.username ?? ""] as const),
    );

    // Compute today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // For each friend, fetch today's non-private tasks
    const results = await Promise.all(
      friendIds.map(async (friendId) => {
        const tasks: Doc<"tasks">[] = await ctx.runQuery(
          api.tasks.getTodayTasks,
          {
            userId: friendId,
          },
        );

        const visibleTasks = tasks.filter((t) => !t.is_private);

        return {
          friend_id: friendId,
          friend_username: friendIdToUsername.get(friendId) ?? "",
          tasks: visibleTasks,
        };
      }),
    );

    // Sort by username for stable order
    results.sort((a, b) => a.friend_username.localeCompare(b.friend_username));
    return results;
  },
});

// Query to get today's tasks for a user
export const getTodayTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_due_date", (q) => q.eq("user_id", args.userId))
      .filter((q) =>
        q.or(
          // Not complete, no due date
          q.and(
            q.eq(q.field("is_done"), false),
            q.not(q.gte(q.field("due_date"), 0)),
          ),
          // Due today or earlier
          q.lte(q.field("due_date"), tomorrow.getTime()),
          // Completed today
          q.and(
            q.eq(q.field("is_done"), true),
            q.lte(q.field("updated_at"), tomorrow.getTime()),
          ),
        ),
      )
      .collect();

    return tasks;
  },
});

// Query to get scheduled tasks for a user
export const getScheduledTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_due_date", (q) =>
        q.eq("user_id", args.userId).gt("due_date", today.getTime()),
      )
      .order("asc")
      .collect();

    return tasks;
  },
});

// Query to get archived tasks with pagination
export const getArchivedTasks = query({
  args: {
    userId: v.id("users"),
    page: v.number(),
    pageSize: v.number(),
    beforeTime: v.number(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_done", (q) =>
        q.eq("user_id", args.userId).eq("is_done", true),
      )
      .filter((q) => q.lte(q.field("updated_at"), args.beforeTime))
      .order("desc")
      .paginate({
        cursor: null,
        numItems: args.pageSize,
      });

    return tasks.page;
  },
});

// Query to get archived tasks count
export const getArchivedTasksCount = query({
  args: { userId: v.id("users"), beforeTime: v.number() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_done", (q) =>
        q.eq("user_id", args.userId).eq("is_done", true),
      )
      .filter((q) => q.lte(q.field("updated_at"), args.beforeTime))
      .collect();

    return tasks.length;
  },
});

// Mutation to create a task
export const createTask = mutation({
  args: {
    userId: v.id("users"),
    taskName: v.string(),
    dueDate: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    assignedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      user_id: args.userId,
      task_name: args.taskName,
      due_date: args.dueDate,
      is_done: false,
      is_private: args.isPrivate ?? false,
      assigned_by: args.assignedBy,
      updated_at: Date.now(),
    });

    return taskId;
  },
});

// Mutation to update task name
export const updateTaskName = mutation({
  args: {
    taskId: v.id("tasks"),
    taskName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      task_name: args.taskName,
      updated_at: Date.now(),
    });
  },
});

// Mutation to toggle task done status
export const toggleTaskDone = mutation({
  args: {
    taskId: v.id("tasks"),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      is_done: args.isDone,
      updated_at: Date.now(),
    });
  },
});

// Mutation to update task privacy
export const updateTaskIsPrivate = mutation({
  args: {
    taskId: v.id("tasks"),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      is_private: args.isPrivate,
      updated_at: Date.now(),
    });
  },
});

// Mutation to delete a task
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

// Mutation to update task due date
export const updateTaskDueDate = mutation({
  args: {
    taskId: v.id("tasks"),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      due_date: args.dueDate,
      updated_at: Date.now(),
    });
  },
});

// Mutation to clear archived tasks
export const clearArchivedTasks = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const archivedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_done", (q) =>
        q.eq("user_id", args.userId).eq("is_done", true),
      )
      .collect();

    for (const task of archivedTasks) {
      await ctx.db.delete(task._id);
    }
  },
});
