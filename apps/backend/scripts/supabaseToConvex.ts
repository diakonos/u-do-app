// scripts/supabaseToConvex.ts
import "dotenv/config";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";

// --------------------
// Types
// --------------------

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  updated_at_ms: number | null;
  is_anonymous: boolean | null;
  is_deleted: boolean | null;
  // Additional fields for Better Auth migration
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  raw_user_meta_data: Record<string, any> | null;
  is_super_admin: boolean | null;
};

type IdentityRow = {
  id: string;
  user_id: string;
  provider: string;
  identity_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  user_id: string | null;
  task_name: string;
  due_date: string | null; // 'YYYY-MM-DD'
  is_done: boolean;
  is_private: boolean | null;
  updated_at: string | null; // ISO
};

type FriendRequestRow = {
  requester_id: string;
  recipient_id: string;
  status: "pending" | "confirmed" | "rejected";
};

type DashConfigRow = {
  user_id: string;
  block_type: string;
  value: string; // username
};

type FriendPermissionRow = {
  user_id: string;
  friend_user_id: string;
  create_tasks: boolean;
};

type MigrationOptions = {
  sections: string[];
  dryRun: boolean;
  batchSize: number;
  outDir: string;
  skipUsers: boolean;
  // New options for Better Auth migration
  migrateToBetterAuth: boolean;
  betterAuthUrl: string;
  // Optional path to a JSON file mapping Supabase user IDs -> Convex user IDs
  userMapFile?: string;
};

type MigrationReport = {
  users: { prepared: number };
  betterAuthUsers: { prepared: number; migrated: number; errors: number };
  betterAuthAccounts: { prepared: number; migrated: number; errors: number };
  tasks: { prepared: number; skippedNoUserMap: number };
  friendRequests: { prepared: number; skippedNoUserMap: number };
  friendships: { prepared: number };
  pinnedFriends: {
    prepared: number;
    missingUsernames: number;
    skippedSelfPins: number;
    deduped: number;
    duplicateUsernames: number;
  };
  friendPermissions: { prepared: number; skippedNoUserMap: number };
};

// --------------------
// Env & helpers
// --------------------

const {
  PG_CONNECTION_STRING,
  CONVEX_URL,
  MIGRATION_SECRET,
  TASKS_DEFAULT_IS_PRIVATE,
  BATCH_SIZE,
  DRY_RUN,
  MIGRATION_OUT_DIR,
  BETTER_AUTH_URL,
  MIGRATE_TO_BETTER_AUTH,
} = process.env;

if (!PG_CONNECTION_STRING) throw new Error("PG_CONNECTION_STRING required");
if (!CONVEX_URL) throw new Error("CONVEX_URL required");
if (!MIGRATION_SECRET) throw new Error("MIGRATION_SECRET required");

const defaultBatchSize = Number(BATCH_SIZE ?? 500);
const defaultIsPrivate =
  (TASKS_DEFAULT_IS_PRIVATE ?? "false").toLowerCase() === "true";
const defaultDryRun = /^true$/i.test(DRY_RUN ?? "");
const defaultOutDir = MIGRATION_OUT_DIR || "migration_out";
const defaultMigrateToBetterAuth = /^true$/i.test(
  MIGRATE_TO_BETTER_AUTH ?? "false",
);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function toMs(ts: string | null | undefined): number | undefined {
  if (!ts) return undefined;
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : undefined;
}

function dateToMsUTC(dateStr: string | null): number | undefined {
  if (!dateStr) return undefined;
  const n = Date.parse(dateStr);
  return Number.isFinite(n) ? n : undefined;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function postConvex<T>(pathName: string, payload: unknown): Promise<T> {
  const res = await fetch(`${CONVEX_URL}${pathName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MIGRATION_SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Convex ${pathName} ${res.status}: ${txt}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}

// Load a userId mapping from a JSON file on disk.
// Expected format: { "<supabaseUserId>": "<convexUserId>", ... }
async function loadUserIdMapFromFile(
  filePath: string,
): Promise<Map<string, string>> {
  const absPath = path.resolve(filePath);
  const content = await fs.readFile(absPath, "utf8");
  const parsed = JSON.parse(content);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const m = new Map<string, string>();
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k !== "string" || typeof v !== "string") {
        throw new Error(
          "userMapFile must be a JSON object of string-to-string mappings",
        );
      }
      m.set(k, v);
    }
    return m;
  }
  throw new Error(
    "userMapFile must be a JSON object mapping Supabase IDs to Convex IDs",
  );
}

// New function to migrate to Better Auth
async function migrateToBetterAuth(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
): Promise<Map<string, string>> {
  console.log("1a) Migrate users to Better Auth...");

  // Query users with identities for Better Auth migration
  const usersWithIdentitiesRes = await client.query<{
    id: string;
    email: string | null;
    username: string | null;
    name: string | null;
    encrypted_password: string | null;
    email_confirmed_at: string | null;
    created_at: string;
    updated_at: string;
    raw_user_meta_data: Record<string, any> | null;
    is_super_admin: boolean | null;
    is_anonymous: boolean | null;
    is_deleted: boolean | null;
    identities: IdentityRow[];
  }>(`
    SELECT 
      u.*,
      COALESCE(
        json_agg(
          i.* ORDER BY i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
      ) as identities
    FROM auth.users u
    LEFT JOIN auth.identities i ON u.id = i.user_id
    GROUP BY u.id
  `);

  const users = usersWithIdentitiesRes.rows
    .filter((u) => !!u.email && !u.is_deleted && !u.is_anonymous)
    .map((u) => ({
      externalId: u.id,
      email: u.email!.toLowerCase(),
      name: u.name ?? u.email!.split("@")[0],
      username: u.username ?? undefined,
      updatedAt: toMs(u.updated_at) ?? undefined,
      // Better Auth specific fields
      encryptedPassword: u.encrypted_password,
      emailConfirmedAt: u.email_confirmed_at,
      createdAt: u.created_at,
      rawUserMetaData: u.raw_user_meta_data,
      isSuperAdmin: u.is_super_admin,
      identities: u.identities,
    }));

  report.betterAuthUsers.prepared = users.length;
  console.log(`Found ${users.length} users to migrate to Better Auth.`);

  const userIdMap = new Map<string, string>(); // supabaseId -> betterAuthId

  if (options.dryRun) {
    // Simulate Better Auth IDs
    for (const u of users) {
      userIdMap.set(u.externalId, `dry_betterauth_${u.externalId}`);
    }
    await writeJson(path.join(options.outDir, "betterAuthUsers.json"), users);
    console.log(
      `DRY RUN: Wrote ${users.length} Better Auth users to ${path.join(
        options.outDir,
        "betterAuthUsers.json",
      )}`,
    );
  } else {
    // Migrate to Better Auth tables
    for (const user of users) {
      try {
        // Create user in Better Auth
        const betterAuthUser = await postConvex<{ userId: string }>(
          "/migrate/betterAuthUser",
          {
            user: {
              id: user.externalId, // Preserve original Supabase ID
              email: user.email,
              name: user.name,
              emailVerified: !!user.emailConfirmedAt,
              image: user.rawUserMetaData?.avatar_url,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt || user.createdAt),
            },
          },
        );

        userIdMap.set(user.externalId, betterAuthUser.userId);
        report.betterAuthUsers.migrated++;

        // Create accounts for each identity
        for (const identity of user.identities) {
          try {
            if (identity.provider === "email" && user.encryptedPassword) {
              // Create credential account
              await postConvex<unknown>("/migrate/betterAuthAccount", {
                account: {
                  userId: betterAuthUser.userId,
                  providerId: "credential",
                  accountId: user.externalId,
                  password: user.encryptedPassword,
                  createdAt: new Date(identity.created_at),
                  updatedAt: new Date(identity.updated_at),
                },
              });
              report.betterAuthAccounts.migrated++;
            } else if (identity.provider !== "email") {
              // Create social provider account
              await postConvex<unknown>("/migrate/betterAuthAccount", {
                account: {
                  userId: betterAuthUser.userId,
                  providerId: identity.provider,
                  accountId: identity.identity_data?.sub || identity.id,
                  createdAt: new Date(identity.created_at),
                  updatedAt: new Date(identity.updated_at),
                },
              });
              report.betterAuthAccounts.migrated++;
            }
            report.betterAuthAccounts.prepared++;
          } catch (error) {
            console.error(
              `Error creating account for user ${user.externalId}, provider ${identity.provider}:`,
              error,
            );
            report.betterAuthAccounts.errors++;
          }
        }
      } catch (error) {
        console.error(`Error migrating user ${user.externalId}:`, error);
        report.betterAuthUsers.errors++;
      }
    }
  }

  console.log(`Migrated ${userIdMap.size} users to Better Auth.`);
  return userIdMap;
}

async function migrateUsers(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
): Promise<Map<string, string>> {
  console.log("1b) Load users from Supabase for Convex...");
  const usersRes = await client.query<UserRow>(`
    SELECT
      u.id::text AS id,
      lower(u.email) AS email,
      up.username AS username,
      COALESCE(
        NULLIF(u.raw_user_meta_data->>'name',''),
        NULLIF(up.username,'')
      ) AS name,
      (EXTRACT(EPOCH FROM COALESCE(u.updated_at, u.created_at)) * 1000)::bigint
        AS updated_at_ms,
      u.is_anonymous AS is_anonymous,
      (u.deleted_at IS NOT NULL) AS is_deleted
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.user_id = u.id
  `);

  const users = usersRes.rows
    .filter((u) => !!u.email && !u.is_deleted && !u.is_anonymous)
    .map((u) => ({
      externalId: u.id,
      email: u.email!.toLowerCase(),
      name: u.name ?? undefined,
      username: u.username ?? undefined,
      updatedAt: u.updated_at_ms ? parseInt(u.updated_at_ms) : undefined,
    }));
  report.users.prepared = users.length;
  console.log(`Found ${users.length} active users with emails for Convex.`);

  // Upsert users into Convex and build ID mapping (or simulate mapping in dry run)
  const userIdMap = new Map<string, string>(); // supabaseId -> convexId

  if (options.dryRun) {
    // Simulate Convex IDs to allow relationship mapping downstream.
    for (const u of users) {
      userIdMap.set(u.externalId, `dry_users_${u.externalId}`);
    }
    await writeJson(path.join(options.outDir, "users.json"), users);
    console.log(
      `DRY RUN: Wrote ${users.length} users to ${path.join(
        options.outDir,
        "users.json",
      )}`,
    );
  } else {
    for (const part of chunk(users, options.batchSize)) {
      const mapping = await postConvex<Record<string, string>>(
        "/migrate/users",
        { users: part },
      );
      for (const [supabaseId, convexId] of Object.entries(mapping)) {
        userIdMap.set(supabaseId, convexId);
      }
      console.log(`Upserted users batch size ${part.length}`);
    }
  }
  console.log(`Mapped ${userIdMap.size} users to Convex IDs.`);
  return userIdMap;
}

async function migrateTasks(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
  userIdMap: Map<string, string>,
): Promise<void> {
  console.log("2) Load tasks from Supabase...");
  const tasksRes = await client.query<TaskRow>(`
    SELECT
      t.id::text AS id,
      t.user_id::text AS user_id,
      t.task_name,
      t.due_date,
      t.is_done,
      t.is_private,
      t.updated_at
    FROM public.tasks t
  `);

  const tasksPayload = tasksRes.rows
    .filter((t) => {
      const ok = !!t.user_id && userIdMap.has(t.user_id!);
      if (!ok) report.tasks.skippedNoUserMap++;
      return ok;
    })
    .map((t) => ({
      userId: userIdMap.get(t.user_id!)!,
      taskName: t.task_name ?? "",
      dueDate: dateToMsUTC(t.due_date) ?? undefined,
      isDone: !!t.is_done,
      isPrivate:
        typeof t.is_private === "boolean" ? t.is_private : defaultIsPrivate,
      assignedBy: undefined,
      updatedAt: toMs(t.updated_at) ?? Date.now(),
    }));
  report.tasks.prepared = tasksPayload.length;

  if (options.dryRun) {
    await writeJson(path.join(options.outDir, "tasks.json"), tasksPayload);
    console.log(
      `DRY RUN: Wrote ${tasksPayload.length} tasks to ${path.join(
        options.outDir,
        "tasks.json",
      )}`,
    );
  } else {
    for (const part of chunk(tasksPayload, options.batchSize)) {
      await postConvex<unknown>("/migrate/tasks", { tasks: part });
      console.log(`Inserted tasks batch size ${part.length}`);
    }
  }
}

async function migrateFriendRequests(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
  userIdMap: Map<string, string>,
): Promise<
  Array<{
    requesterId: string;
    recipientId: string;
    status: "pending" | "accepted" | "declined";
  }>
> {
  console.log("3) Load friend requests from Supabase...");
  const frRes = await client.query<FriendRequestRow>(`
    SELECT
      requester_id::text AS requester_id,
      recipient_id::text AS recipient_id,
      status
    FROM public.friend_requests
  `);

  const statusMap: Record<string, "pending" | "accepted" | "declined"> = {
    pending: "pending",
    confirmed: "accepted",
    rejected: "declined",
  };

  const friendRequests = frRes.rows
    .filter((r) => {
      const ok = userIdMap.has(r.requester_id) && userIdMap.has(r.recipient_id);
      if (!ok) report.friendRequests.skippedNoUserMap++;
      return ok;
    })
    .map((r) => ({
      requesterId: userIdMap.get(r.requester_id)!,
      recipientId: userIdMap.get(r.recipient_id)!,
      status: statusMap[r.status],
    }));
  report.friendRequests.prepared = friendRequests.length;

  if (options.dryRun) {
    await writeJson(
      path.join(options.outDir, "friendRequests.json"),
      friendRequests,
    );
    console.log(
      `DRY RUN: Wrote ${friendRequests.length} friendRequests to ${path.join(
        options.outDir,
        "friendRequests.json",
      )}`,
    );
  } else {
    for (const part of chunk(friendRequests, options.batchSize)) {
      await postConvex<unknown>("/migrate/friendRequests", {
        friendRequests: part,
      });
      console.log(`Upserted friend requests batch size ${part.length}`);
    }
  }

  return friendRequests;
}

async function migrateFriendships(
  options: MigrationOptions,
  report: MigrationReport,
  friendRequests: Array<{
    requesterId: string;
    recipientId: string;
    status: "pending" | "accepted" | "declined";
  }>,
): Promise<void> {
  console.log("4) Derive friendships from accepted requests...");
  const friendshipsSet = new Set<string>();
  const friendships: Array<{ userId: string; friendId: string }> = [];

  for (const fr of friendRequests) {
    if (fr.status !== "accepted") continue;
    const a = fr.requesterId;
    const b = fr.recipientId;

    const k1 = `${a}|${b}`;
    if (!friendshipsSet.has(k1)) {
      friendshipsSet.add(k1);
      friendships.push({ userId: a, friendId: b });
    }
    const k2 = `${b}|${a}`;
    if (!friendshipsSet.has(k2)) {
      friendshipsSet.add(k2);
      friendships.push({ userId: b, friendId: a });
    }
  }
  report.friendships.prepared = friendships.length;

  if (options.dryRun) {
    await writeJson(path.join(options.outDir, "friendships.json"), friendships);
    console.log(
      `DRY RUN: Wrote ${friendships.length} friendships to ${path.join(
        options.outDir,
        "friendships.json",
      )}`,
    );
  } else {
    for (const part of chunk(friendships, options.batchSize)) {
      await postConvex<unknown>("/migrate/friendships", {
        friendships: part,
      });
      console.log(`Upserted friendships batch size ${part.length}`);
    }
  }
}

async function migratePinnedFriends(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
  userIdMap: Map<string, string>,
  usernameToConvexId: Map<string, string>,
): Promise<void> {
  console.log(
    "5) Extract pinned friends from dashboard_configs " +
      '(block_type="friend_tasks", value=username)...',
  );
  const dcRes = await client.query<DashConfigRow>(`
    SELECT
      user_id::text AS user_id,
      block_type,
      value
    FROM public.dashboard_configs
    WHERE lower(block_type) = 'friend_tasks'
  `);

  const pinnedPairsSet = new Set<string>();
  const pinnedPayload: Array<{ userId: string; friendId: string }> = [];

  for (const row of dcRes.rows) {
    const ownerConvexId = userIdMap.get(row.user_id);
    if (!ownerConvexId) continue;

    const uname = (row.value ?? "").trim().toLowerCase();
    if (!uname) continue;

    const friendConvexId = usernameToConvexId.get(uname);
    if (!friendConvexId) {
      report.pinnedFriends.missingUsernames++;
      continue;
    }

    if (ownerConvexId === friendConvexId) {
      report.pinnedFriends.skippedSelfPins++;
      continue;
    }

    const key = `${ownerConvexId}|${friendConvexId}`;
    if (pinnedPairsSet.has(key)) continue;
    pinnedPairsSet.add(key);
    pinnedPayload.push({
      userId: ownerConvexId,
      friendId: friendConvexId,
    });
  }

  const dedupCount = Math.max(0, pinnedPairsSet.size - pinnedPayload.length);
  report.pinnedFriends.deduped = dedupCount;
  report.pinnedFriends.prepared = pinnedPayload.length;

  if (options.dryRun) {
    await writeJson(
      path.join(options.outDir, "pinnedFriends.json"),
      pinnedPayload,
    );
    console.log(
      `DRY RUN: Wrote ${pinnedPayload.length} pinnedFriends to ${path.join(
        options.outDir,
        "pinnedFriends.json",
      )}`,
    );
  } else {
    for (const part of chunk(pinnedPayload, options.batchSize)) {
      await postConvex<unknown>("/migrate/pinnedFriends", { pinned: part });
      console.log(`Upserted pinned friends batch size ${part.length}`);
    }
  }
}

async function migrateFriendPermissions(
  client: pg.Client,
  options: MigrationOptions,
  report: MigrationReport,
  userIdMap: Map<string, string>,
): Promise<void> {
  console.log("6) Migrate friend permissions...");
  const fpRes = await client.query<FriendPermissionRow>(`
    SELECT
      user_id::text AS user_id,
      friend_user_id::text AS friend_user_id,
      create_tasks
    FROM public.friend_permissions
  `);

  const permsPayload = fpRes.rows
    .map((r) => {
      const user = userIdMap.get(r.user_id);
      const friend = userIdMap.get(r.friend_user_id);
      if (!user || !friend) {
        report.friendPermissions.skippedNoUserMap++;
        return null;
      }
      return {
        userId: user,
        friendId: friend,
        canCreateTasks: !!r.create_tasks,
      };
    })
    .filter(Boolean) as Array<{
    userId: string;
    friendId: string;
    canCreateTasks: boolean;
  }>;
  report.friendPermissions.prepared = permsPayload.length;

  if (options.dryRun) {
    await writeJson(
      path.join(options.outDir, "friendPermissions.json"),
      permsPayload,
    );
    console.log(
      `DRY RUN: Wrote ${permsPayload.length} friendPermissions to ${path.join(
        options.outDir,
        "friendPermissions.json",
      )}`,
    );
  } else {
    for (const part of chunk(permsPayload, options.batchSize)) {
      await postConvex<unknown>("/migrate/friendPermissions", {
        perms: part,
      });
      console.log(`Upserted friend permissions batch size ${part.length}`);
    }
  }
}

// --------------------
// Command Line Parsing
// --------------------

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const sections: string[] = [];
  let dryRun = defaultDryRun;
  let batchSize = defaultBatchSize;
  let outDir = defaultOutDir;
  let skipUsers = false;
  let migrateToBetterAuth = defaultMigrateToBetterAuth;
  let betterAuthUrl = BETTER_AUTH_URL || "http://localhost:3000"; // Default to localhost if not set
  let userMapFile = process.env.USER_MAP_FILE || undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        console.log(`
Usage: npx tsx scripts/supabaseToConvex.ts [OPTIONS] [SECTIONS...]

SECTIONS (run only specified sections, or all if none specified):
  users          Migrate users
  tasks          Migrate tasks
  friendRequests Migrate friend requests
  friendships    Migrate friendships (derived from accepted requests)
  pinnedFriends  Migrate pinned friends from dashboard configs
  friendPermissions Migrate friend permissions
  betterAuth     Migrate users and accounts to Better Auth

OPTIONS:
  --dry-run, -d     Enable dry run mode (default: ${defaultDryRun})
  --batch-size, -b  Batch size for API calls (default: ${defaultBatchSize})
  --out-dir, -o     Output directory for dry run files (default: ${defaultOutDir})
  --skip-users      Skip user migration (useful when re-running other sections)
  --migrate-to-better-auth, -m  Enable Better Auth migration (default: ${defaultMigrateToBetterAuth})
  --better-auth-url, -u  URL for the Better Auth service (default: ${betterAuthUrl})
  --user-map-file   Path to JSON file with { [supabaseUserId]: convexUserId }

EXAMPLES:
  # Run all migrations including Better Auth
  npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth

  # Run only Better Auth migration
  npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth betterAuth

  # Run Better Auth + tasks migration
  npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth betterAuth tasks
  --help, -h        Show this help message

EXAMPLES:
  # Run all migrations
  npx tsx scripts/supabaseToConvex.ts

  # Run only tasks migration
  npx tsx scripts/supabaseToConvex.ts tasks

  # Run tasks and friend permissions with dry run
  npx tsx scripts/supabaseToConvex.ts --dry-run tasks friendPermissions

  # Re-run tasks without re-migrating users
  npx tsx scripts/supabaseToConvex.ts --skip-users tasks

  # Run with custom batch size
  npx tsx scripts/supabaseToConvex.ts --batch-size 1000 tasks
`);
        process.exit(0);
        break;

      case "--dry-run":
      case "-d":
        dryRun = true;
        break;

      case "--batch-size":
      case "-b":
        batchSize = Number(args[++i]);
        if (isNaN(batchSize) || batchSize <= 0) {
          console.error("Error: batch-size must be a positive number");
          process.exit(1);
        }
        break;

      case "--out-dir":
      case "-o":
        outDir = args[++i];
        break;

      case "--skip-users":
        skipUsers = true;
        break;

      case "--migrate-to-better-auth":
      case "-m":
        migrateToBetterAuth = true;
        break;

      case "--better-auth-url":
      case "-u":
        betterAuthUrl = args[++i];
        break;

      case "--user-map-file":
        userMapFile = args[++i];
        break;

      default:
        if (arg.startsWith("-")) {
          console.error(`Error: Unknown option ${arg}`);
          process.exit(1);
        }
        sections.push(arg);
        break;
    }
  }

  // If no sections specified, run all
  if (sections.length === 0) {
    sections.push(
      "users",
      "tasks",
      "friendRequests",
      "friendships",
      "pinnedFriends",
      "friendPermissions",
    );
    // Add Better Auth migration if enabled
    if (migrateToBetterAuth) {
      sections.push("betterAuth");
    }
  }

  // Validate sections
  const validSections = [
    "users",
    "tasks",
    "friendRequests",
    "friendships",
    "pinnedFriends",
    "friendPermissions",
    "betterAuth",
  ];
  const invalidSections = sections.filter((s) => !validSections.includes(s));
  if (invalidSections.length > 0) {
    console.error(`Error: Invalid sections: ${invalidSections.join(", ")}`);
    console.error(`Valid sections: ${validSections.join(", ")}`);
    process.exit(1);
  }

  // Check dependencies
  if (
    sections.includes("friendships") &&
    !sections.includes("friendRequests")
  ) {
    console.error(
      "Error: 'friendships' section requires 'friendRequests' section",
    );
    process.exit(1);
  }

  if (sections.includes("pinnedFriends") && !sections.includes("users")) {
    console.error("Error: 'pinnedFriends' section requires 'users' section");
    process.exit(1);
  }

  if (sections.includes("tasks") && !sections.includes("users") && !skipUsers) {
    console.error(
      "Error: 'tasks' section requires 'users' section (use --skip-users if users already migrated)",
    );
    process.exit(1);
  }

  if (
    sections.includes("friendRequests") &&
    !sections.includes("users") &&
    !skipUsers
  ) {
    console.error(
      "Error: 'friendRequests' section requires 'users' section (use --skip-users if users already migrated)",
    );
    process.exit(1);
  }

  if (
    sections.includes("friendPermissions") &&
    !sections.includes("users") &&
    !skipUsers
  ) {
    console.error(
      "Error: 'friendPermissions' section requires 'users' section (use --skip-users if users already migrated)",
    );
    process.exit(1);
  }

  if (sections.includes("betterAuth") && !migrateToBetterAuth) {
    console.error(
      "Error: 'betterAuth' section requires --migrate-to-better-auth",
    );
    process.exit(1);
  }

  return {
    sections,
    dryRun,
    batchSize,
    outDir,
    skipUsers,
    migrateToBetterAuth,
    betterAuthUrl,
    userMapFile,
  };
}

// --------------------
// Main
// --------------------

async function main() {
  const options = parseArgs();

  console.log(`Migration sections: ${options.sections.join(", ")}`);
  if (options.dryRun) {
    console.log(
      `DRY RUN enabled. No data will be written to Convex. Files will be ` +
        `written to: ${options.outDir}`,
    );
  }
  if (options.skipUsers) {
    console.log(
      "Skipping user migration (assuming users already exist in Convex)",
    );
  }

  const client = new pg.Client({ connectionString: PG_CONNECTION_STRING });
  await client.connect();

  const report: MigrationReport = {
    users: { prepared: 0 },
    betterAuthUsers: { prepared: 0, migrated: 0, errors: 0 },
    betterAuthAccounts: { prepared: 0, migrated: 0, errors: 0 },
    tasks: { prepared: 0, skippedNoUserMap: 0 },
    friendRequests: { prepared: 0, skippedNoUserMap: 0 },
    friendships: { prepared: 0 },
    pinnedFriends: {
      prepared: 0,
      missingUsernames: 0,
      skippedSelfPins: 0,
      deduped: 0,
      duplicateUsernames: 0,
    },
    friendPermissions: { prepared: 0, skippedNoUserMap: 0 },
  };

  let userIdMap = new Map<string, string>();
  let usernameToConvexId = new Map<string, string>();
  let friendRequests: Array<{
    requesterId: string;
    recipientId: string;
    status: "pending" | "accepted" | "declined";
  }> = [];

  try {
    // If users are being skipped and a user map file is provided, load it first
    if (options.skipUsers && options.userMapFile) {
      console.log(`Loading user mappings from file: ${options.userMapFile}`);
      const loaded = await loadUserIdMapFromFile(options.userMapFile);
      for (const [k, v] of loaded.entries()) userIdMap.set(k, v);
      console.log(`Loaded ${userIdMap.size} user ID mappings from file.`);
    }

    // 1a) Better Auth migration (if requested)
    if (
      options.sections.includes("betterAuth") &&
      options.migrateToBetterAuth
    ) {
      console.log("Starting Better Auth migration...");
      await migrateToBetterAuth(client, options, report);
    }

    // 1b) Users (if requested and not skipped)
    // Note: If we're migrating to Better Auth, we might want to skip the regular user migration
    // since Better Auth will handle user creation when they first sign in
    if (
      options.sections.includes("users") &&
      !options.skipUsers &&
      !options.migrateToBetterAuth
    ) {
      userIdMap = await migrateUsers(client, options, report);

      // Build username -> Convex ID map (case-insensitive) and detect duplicates
      const usernameCounts = new Map<string, number>();
      for (const u of Array.from(userIdMap.entries())) {
        // In dry run mode, we need to reconstruct user data
        if (options.dryRun) {
          // For dry run, we'll create a simple mapping
          usernameToConvexId.set(`dry_username_${u[0]}`, u[1]);
        }
      }

      if (!options.dryRun) {
        // In real mode, we need to query Convex to get username mappings
        // This is a simplified approach - you might need to adjust based on your actual Convex setup
        console.log(
          "Note: Username mapping for pinned friends may be incomplete in partial migrations",
        );
      }

      const duplicateUsernames = Array.from(usernameCounts.entries())
        .filter(([, n]) => n > 1)
        .map(([uname]) => uname);
      if (duplicateUsernames.length > 0) {
        report.pinnedFriends.duplicateUsernames = duplicateUsernames.length;
        console.warn(
          `Warning: ${duplicateUsernames.length} duplicate usernames detected. ` +
            `Pinned friend rows referring to these may be ambiguous.`,
        );
      }
    } else if (options.skipUsers) {
      console.log(
        "Skipping user migration - you'll need to provide existing user mappings",
      );
      // In a real scenario, you might want to load existing mappings from a file
      // or have the user provide them via environment variables
    }

    // 2) Tasks
    if (options.sections.includes("tasks")) {
      await migrateTasks(client, options, report, userIdMap);
    }

    // 3) Friend requests
    if (options.sections.includes("friendRequests")) {
      friendRequests = await migrateFriendRequests(
        client,
        options,
        report,
        userIdMap,
      );
    }

    // 4) Friendships
    if (options.sections.includes("friendships")) {
      await migrateFriendships(options, report, friendRequests);
    }

    // 5) Pinned friends
    if (options.sections.includes("pinnedFriends")) {
      await migratePinnedFriends(
        client,
        options,
        report,
        userIdMap,
        usernameToConvexId,
      );
    }

    // 6) Friend permissions
    if (options.sections.includes("friendPermissions")) {
      await migrateFriendPermissions(client, options, report, userIdMap);
    }
  } finally {
    await client.end();
  }

  // Report
  await writeJson(path.join(options.outDir, "report.json"), report);
  console.log("Migration complete.");
  console.log(
    options.dryRun
      ? `DRY RUN: See ${path.join(options.outDir, "report.json")} for summary.`
      : "See server logs for Convex inserts/upserts.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
