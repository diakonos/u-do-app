import { httpRouter } from "convex/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../lib/auth";
import {
  migrateUsersHttp,
  migrateTasksHttp,
  migrateFriendRequestsHttp,
  migrateFriendshipsHttp,
  migratePinnedFriendsHttp,
  migrateFriendPermissionsHttp,
} from "./import";

const http = httpRouter();

// { cors: true } is required for client side frameworks
betterAuthComponent.registerRoutes(http, createAuth, { cors: true });

// Add webhooks here if/when needed

export default http;

/* Supabase migration endpoints */
http.route({
  path: "/migrate/users",
  method: "POST",
  handler: migrateUsersHttp,
});

http.route({
  path: "/migrate/tasks",
  method: "POST",
  handler: migrateTasksHttp,
});

http.route({
  path: "/migrate/friendRequests",
  method: "POST",
  handler: migrateFriendRequestsHttp,
});

http.route({
  path: "/migrate/friendships",
  method: "POST",
  handler: migrateFriendshipsHttp,
});

http.route({
  path: "/migrate/pinnedFriends",
  method: "POST",
  handler: migratePinnedFriendsHttp,
});

http.route({
  path: "/migrate/friendPermissions",
  method: "POST",
  handler: migrateFriendPermissionsHttp,
});
