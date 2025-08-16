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
} = process.env;

if (!PG_CONNECTION_STRING) throw new Error("PG_CONNECTION_STRING required");
if (!CONVEX_URL) throw new Error("CONVEX_URL required");
if (!MIGRATION_SECRET) throw new Error("MIGRATION_SECRET required");

const batchSize = Number(BATCH_SIZE ?? 500);
const defaultIsPrivate =
  (TASKS_DEFAULT_IS_PRIVATE ?? "false").toLowerCase() === "true";
const dryRun = /^true$/i.test(DRY_RUN ?? "");
const outDir = MIGRATION_OUT_DIR || "migration_out";

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
  const iso = `${dateStr}T00:00:00Z`;
  const n = Date.parse(iso);
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

// --------------------
// Main
// --------------------

async function main() {
  if (dryRun) {
    console.log(
      `DRY RUN enabled. No data will be written to Convex. Files will be ` +
        `written to: ${outDir}`,
    );
  }

  const client = new pg.Client({ connectionString: PG_CONNECTION_STRING });
  await client.connect();

  const report = {
    users: { prepared: 0 },
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

  // 1) Users
  console.log("1) Load users from Supabase...");
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
      updatedAt: u.updated_at_ms ?? undefined,
    }));
  report.users.prepared = users.length;
  console.log(`Found ${users.length} active users with emails.`);

  // Upsert users into Convex and build ID mapping (or simulate mapping in dry run)
  const userIdMap = new Map<string, string>(); // supabaseId -> convexId

  if (dryRun) {
    // Simulate Convex IDs to allow relationship mapping downstream.
    for (const u of users) {
      userIdMap.set(u.externalId, `dry_users_${u.externalId}`);
    }
    await writeJson(path.join(outDir, "users.json"), users);
    console.log(
      `DRY RUN: Wrote ${users.length} users to ${path.join(
        outDir,
        "users.json",
      )}`,
    );
  } else {
    for (const part of chunk(users, batchSize)) {
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

  // Build username -> Convex ID map (case-insensitive) and detect duplicates
  const usernameToConvexId = new Map<string, string>();
  const usernameCounts = new Map<string, number>();
  for (const u of users) {
    if (!u.username) continue;
    const key = u.username.toLowerCase();
    usernameCounts.set(key, (usernameCounts.get(key) ?? 0) + 1);
    const convexId = userIdMap.get(u.externalId);
    if (convexId) {
      // last-wins if duplicates; we'll also warn.
      usernameToConvexId.set(key, convexId);
    }
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

  // 2) Tasks
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

  if (dryRun) {
    await writeJson(path.join(outDir, "tasks.json"), tasksPayload);
    console.log(
      `DRY RUN: Wrote ${tasksPayload.length} tasks to ${path.join(
        outDir,
        "tasks.json",
      )}`,
    );
  } else {
    for (const part of chunk(tasksPayload, batchSize)) {
      await postConvex<unknown>("/migrate/tasks", { tasks: part });
      console.log(`Inserted tasks batch size ${part.length}`);
    }
  }

  // 3) Friend requests
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

  if (dryRun) {
    await writeJson(path.join(outDir, "friendRequests.json"), friendRequests);
    console.log(
      `DRY RUN: Wrote ${friendRequests.length} friendRequests to ${path.join(
        outDir,
        "friendRequests.json",
      )}`,
    );
  } else {
    for (const part of chunk(friendRequests, batchSize)) {
      await postConvex<unknown>("/migrate/friendRequests", {
        friendRequests: part,
      });
      console.log(`Upserted friend requests batch size ${part.length}`);
    }
  }

  // 4) Friendships (derived from accepted requests)
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

  if (dryRun) {
    await writeJson(path.join(outDir, "friendships.json"), friendships);
    console.log(
      `DRY RUN: Wrote ${friendships.length} friendships to ${path.join(
        outDir,
        "friendships.json",
      )}`,
    );
  } else {
    for (const part of chunk(friendships, batchSize)) {
      await postConvex<unknown>("/migrate/friendships", {
        friendships: part,
      });
      console.log(`Upserted friendships batch size ${part.length}`);
    }
  }

  // 5) Pinned friends from dashboard_configs (block_type='friend_tasks', value=username)
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

  if (dryRun) {
    await writeJson(path.join(outDir, "pinnedFriends.json"), pinnedPayload);
    console.log(
      `DRY RUN: Wrote ${pinnedPayload.length} pinnedFriends to ${path.join(
        outDir,
        "pinnedFriends.json",
      )}`,
    );
  } else {
    for (const part of chunk(pinnedPayload, batchSize)) {
      await postConvex<unknown>("/migrate/pinnedFriends", { pinned: part });
      console.log(`Upserted pinned friends batch size ${part.length}`);
    }
  }

  // 6) Friend permissions
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

  if (dryRun) {
    await writeJson(path.join(outDir, "friendPermissions.json"), permsPayload);
    console.log(
      `DRY RUN: Wrote ${permsPayload.length} friendPermissions to ${path.join(
        outDir,
        "friendPermissions.json",
      )}`,
    );
  } else {
    for (const part of chunk(permsPayload, batchSize)) {
      await postConvex<unknown>("/migrate/friendPermissions", {
        perms: part,
      });
      console.log(`Upserted friend permissions batch size ${part.length}`);
    }
  }

  await client.end();

  // Report
  await writeJson(path.join(outDir, "report.json"), report);
  console.log("Migration complete.");
  console.log(
    dryRun
      ? `DRY RUN: See ${path.join(outDir, "report.json")} for summary.`
      : "See server logs for Convex inserts/upserts.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
