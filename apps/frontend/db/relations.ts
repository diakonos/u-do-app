import { relations } from 'drizzle-orm/relations';
import {
  userProfiles,
  tasks,
  usersInAuth,
  friendRequests,
  dashboardConfigs,
  notificationDeliveryStatuses,
  notifications,
  notificationTypes,
} from './schema';

export const tasksRelations = relations(tasks, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [tasks.userId],
    references: [userProfiles.userId],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  tasks: many(tasks),
  usersInAuth: one(usersInAuth, {
    fields: [userProfiles.userId],
    references: [usersInAuth.id],
  }),
  friendRequests_recipientId: many(friendRequests, {
    relationName: 'friendRequests_recipientId_userProfiles_userId',
  }),
  friendRequests_requesterId: many(friendRequests, {
    relationName: 'friendRequests_requesterId_userProfiles_userId',
  }),
  dashboardConfigs: many(dashboardConfigs),
  notifications_senderUserId: many(notifications, {
    relationName: 'notifications_senderUserId_userProfiles_userId',
  }),
  notifications_targetUserId: many(notifications, {
    relationName: 'notifications_targetUserId_userProfiles_userId',
  }),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  userProfiles: many(userProfiles),
}));

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  userProfile_recipientId: one(userProfiles, {
    fields: [friendRequests.recipientId],
    references: [userProfiles.userId],
    relationName: 'friendRequests_recipientId_userProfiles_userId',
  }),
  userProfile_requesterId: one(userProfiles, {
    fields: [friendRequests.requesterId],
    references: [userProfiles.userId],
    relationName: 'friendRequests_requesterId_userProfiles_userId',
  }),
}));

export const dashboardConfigsRelations = relations(dashboardConfigs, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [dashboardConfigs.userId],
    references: [userProfiles.userId],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  notificationDeliveryStatus: one(notificationDeliveryStatuses, {
    fields: [notifications.deliveryStatus],
    references: [notificationDeliveryStatuses.id],
  }),
  userProfile_senderUserId: one(userProfiles, {
    fields: [notifications.senderUserId],
    references: [userProfiles.userId],
    relationName: 'notifications_senderUserId_userProfiles_userId',
  }),
  userProfile_targetUserId: one(userProfiles, {
    fields: [notifications.targetUserId],
    references: [userProfiles.userId],
    relationName: 'notifications_targetUserId_userProfiles_userId',
  }),
  notificationType: one(notificationTypes, {
    fields: [notifications.type],
    references: [notificationTypes.id],
  }),
}));

export const notificationDeliveryStatusesRelations = relations(
  notificationDeliveryStatuses,
  ({ many }) => ({
    notifications: many(notifications),
  }),
);

export const notificationTypesRelations = relations(notificationTypes, ({ many }) => ({
  notifications: many(notifications),
}));
