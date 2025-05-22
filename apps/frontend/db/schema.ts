import {
  pgTable,
  foreignKey,
  pgPolicy,
  bigint,
  timestamp,
  text,
  date,
  boolean,
  uuid,
  unique,
  varchar,
  check,
  index,
  integer,
  smallint,
  pgView,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tasks = pgTable(
  'tasks',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'tasks_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    taskName: text('task_name').default('').notNull(),
    dueDate: date('due_date'),
    isDone: boolean('is_done').default(false).notNull(),
    userId: uuid('user_id'),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [userProfiles.userId],
      name: 'tasks_user_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Allow users to view tasks of friends', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
      using: sql`(EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE ((fr.status = 'confirmed'::text) AND (((fr.requester_id = auth.uid()) AND (fr.recipient_id = tasks.user_id)) OR ((fr.recipient_id = auth.uid()) AND (fr.requester_id = tasks.user_id))))))`,
    }),
    pgPolicy('Users can delete their own tasks', {
      as: 'permissive',
      for: 'delete',
      to: ['authenticated'],
    }),
    pgPolicy('Users can insert their own tasks', {
      as: 'permissive',
      for: 'insert',
      to: ['authenticated'],
    }),
    pgPolicy('Users can update their own tasks', {
      as: 'permissive',
      for: 'update',
      to: ['authenticated'],
    }),
    pgPolicy('Users can view their own tasks', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
    }),
  ],
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'user_profiles_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    userId: uuid('user_id').notNull(),
    username: varchar(),
    email: varchar(),
  },
  table => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_profiles_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('user_profiles_user_id_key').on(table.userId),
    pgPolicy('Anyone can search usernames', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
      using: sql`true`,
    }),
  ],
);

export const friendRequests = pgTable(
  'friend_requests',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'friend_requests_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    requesterId: uuid('requester_id').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    status: text().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }),
  },
  table => [
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [userProfiles.userId],
      name: 'friend_requests_recipient_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [userProfiles.userId],
      name: 'friend_requests_requester_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('unique_friend_request').on(table.requesterId, table.recipientId),
    pgPolicy('Recipients can update friend requests', {
      as: 'permissive',
      for: 'update',
      to: ['authenticated'],
      using: sql`(auth.uid() = recipient_id)`,
    }),
    pgPolicy('Users can create their own friend requests', {
      as: 'permissive',
      for: 'insert',
      to: ['authenticated'],
    }),
    pgPolicy('Users can view their own friend requests', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
    }),
    check(
      'friend_requests_status_check',
      sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])`,
    ),
  ],
);

export const dashboardConfigs = pgTable(
  'dashboard_configs',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'dashboard_configs_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    userId: uuid('user_id').notNull(),
    blockType: text('block_type').notNull(),
    value: text().notNull(),
    order: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  table => [
    index('dashboard_configs_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [userProfiles.userId],
      name: 'dashboard_configs_user_id_fkey',
    }).onDelete('cascade'),
    unique('dashboard_configs_user_id_order_key').on(table.userId, table.order),
    pgPolicy('Users can delete their own dashboard configs', {
      as: 'permissive',
      for: 'delete',
      to: ['public'],
      using: sql`(auth.uid() = user_id)`,
    }),
    pgPolicy('Users can insert their own dashboard configs', {
      as: 'permissive',
      for: 'insert',
      to: ['public'],
    }),
    pgPolicy('Users can update their own dashboard configs', {
      as: 'permissive',
      for: 'update',
      to: ['public'],
    }),
    pgPolicy('Users can view their own dashboard configs', {
      as: 'permissive',
      for: 'select',
      to: ['public'],
    }),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'notifications_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    targetUserId: uuid('target_user_id').notNull(),
    senderUserId: uuid('sender_user_id'),
    type: smallint().notNull(),
    deliveryStatus: smallint('delivery_status').notNull(),
    title: text(),
    message: text(),
    readStatus: boolean('read_status').default(false).notNull(),
  },
  table => [
    foreignKey({
      columns: [table.deliveryStatus],
      foreignColumns: [notificationDeliveryStatuses.id],
      name: 'notifications_delivery_status_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.senderUserId],
      foreignColumns: [userProfiles.userId],
      name: 'notifications_sender_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.targetUserId],
      foreignColumns: [userProfiles.userId],
      name: 'notifications_target_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.type],
      foreignColumns: [notificationTypes.id],
      name: 'notifications_type_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    pgPolicy('Authenticated users can insert notifications', {
      as: 'permissive',
      for: 'insert',
      to: ['authenticated'],
      withCheck: sql`true`,
    }),
    pgPolicy('Service role can delete notifications', {
      as: 'permissive',
      for: 'delete',
      to: ['service_role'],
    }),
    pgPolicy('Service role can insert notifications', {
      as: 'permissive',
      for: 'insert',
      to: ['service_role'],
    }),
    pgPolicy('Service role can select notifications', {
      as: 'permissive',
      for: 'select',
      to: ['service_role'],
    }),
    pgPolicy('Users can create notifications for their friends', {
      as: 'permissive',
      for: 'insert',
      to: ['authenticated'],
    }),
    pgPolicy('Users can delete their own notifications', {
      as: 'permissive',
      for: 'delete',
      to: ['authenticated'],
    }),
    pgPolicy('Users can select their own notifications', {
      as: 'permissive',
      for: 'select',
      to: ['authenticated'],
    }),
  ],
);

export const notificationTypes = pgTable('notification_types', {
  id: smallint().primaryKey().generatedByDefaultAsIdentity({
    name: 'notification_types_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 32767,
    cache: 1,
  }),
  type: text().notNull(),
});

export const notificationDeliveryStatuses = pgTable('notification_delivery_statuses', {
  id: smallint().primaryKey().generatedByDefaultAsIdentity({
    name: 'notification_delivery_statuses_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 32767,
    cache: 1,
  }),
  status: text().notNull(),
});
export const friendsView = pgView('friends_view', {
  id: text(),
  userId: uuid('user_id'),
  friendId: uuid('friend_id'),
  friendUsername: varchar('friend_username'),
  status: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
}).as(
  sql`SELECT concat(f.requester_id, f.recipient_id) AS id, f.requester_id AS user_id, f.recipient_id AS friend_id, u.username AS friend_username, f.status, f.created_at FROM friend_requests f JOIN user_profiles u ON f.recipient_id = u.user_id WHERE f.status = 'confirmed'::text UNION ALL SELECT concat(f.recipient_id, f.requester_id) AS id, f.recipient_id AS user_id, f.requester_id AS friend_id, u.username AS friend_username, f.status, f.created_at FROM friend_requests f JOIN user_profiles u ON f.requester_id = u.user_id WHERE f.status = 'confirmed'::text`,
);
