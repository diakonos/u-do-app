import { mutation } from "./_generated/server";
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join } from 'path';

const readCsvFile = (filename: string) => {
  const content = readFileSync(join(__dirname, 'scripts/data', filename), 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
};

// Migration mutation to set up initial data
export default mutation({
  args: {},
  handler: async (ctx) => {
    // Set up notification delivery statuses
    const deliveryStatuses = readCsvFile('notification_delivery_statuses.csv');
    for (const status of deliveryStatuses) {
      await ctx.db.insert("notificationDeliveryStatuses", { 
        status: status.status 
      });
    }

    // Set up notification types
    const notificationTypes = readCsvFile('notification_types.csv');
    for (const type of notificationTypes) {
      await ctx.db.insert("notificationTypes", { 
        type: type.type 
      });
    }

    // Migrate user profiles
    const userProfiles = readCsvFile('user_profiles.csv');
    for (const profile of userProfiles) {
      await ctx.db.insert("userProfiles", {
        userId: profile.user_id,
        username: profile.username,
        email: profile.email,
      });
    }

    // Migrate tasks
    const tasks = readCsvFile('tasks.csv');
    for (const task of tasks) {
      await ctx.db.insert("tasks", {
        taskName: task.task_name,
        dueDate: task.due_date,
        isDone: task.is_done === 'true',
        userId: task.user_id,
        isPrivate: task.is_private === 'true',
        assignedBy: task.assigned_by,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      });
    }

    // Migrate friend requests
    const friendRequests = readCsvFile('friend_requests.csv');
    for (const request of friendRequests) {
      await ctx.db.insert("friendRequests", {
        requesterId: request.requester_id,
        recipientId: request.recipient_id,
        status: request.status as "pending" | "confirmed" | "rejected",
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      });
    }

    // Migrate notifications
    const notifications = readCsvFile('notifications.csv');
    for (const notification of notifications) {
      await ctx.db.insert("notifications", {
        targetUserId: notification.target_user_id,
        senderUserId: notification.sender_user_id,
        type: parseInt(notification.type, 10),
        deliveryStatus: parseInt(notification.delivery_status, 10),
        title: notification.title,
        message: notification.message,
        readStatus: notification.read_status === 'true',
        createdAt: notification.created_at,
      });
    }

    console.log('Migration completed successfully');
  }
});
