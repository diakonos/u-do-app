# Supabase to Convex + Better Auth Migration Script

This script migrates data from Supabase to both Convex tables and Better Auth, following the [Better Auth migration guide](https://www.better-auth.com/docs/guides/supabase-migration-guide).

## Features

- **Dual Migration**: Migrates users to both Convex tables and Better Auth
- **Flexible Sections**: Run specific migration sections or all at once
- **Dry Run Mode**: Test migrations without affecting production data
- **Batch Processing**: Configurable batch sizes for large datasets
- **Comprehensive Reporting**: Detailed migration reports and error tracking

## Prerequisites

1. **Environment Variables**:

   ```bash
   PG_CONNECTION_STRING=postgresql://...  # Supabase database connection
   CONVEX_URL=https://...                 # Your Convex deployment URL
   MIGRATION_SECRET=your_secret_here      # Secret for migration endpoints
   BETTER_AUTH_URL=http://localhost:3000  # Better Auth service URL (optional)
   MIGRATE_TO_BETTER_AUTH=true           # Enable Better Auth migration (optional)
   ```

2. **Dependencies**: The script requires access to both Supabase and Convex

## Usage

### Basic Commands

```bash
# Run all migrations (Convex tables only)
npx tsx scripts/supabaseToConvex.ts

# Run all migrations including Better Auth
npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth

# Run only specific sections
npx tsx scripts/supabaseToConvex.ts users tasks

# Run Better Auth migration only
npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth betterAuth
```

### Command Line Options

- `--dry-run, -d`: Enable dry run mode (default: false)
- `--batch-size, -b`: Batch size for API calls (default: 500)
- `--out-dir, -o`: Output directory for dry run files (default: migration_out)
- `--skip-users`: Skip user migration (useful when re-running other sections)
- `--migrate-to-better-auth, -m`: Enable Better Auth migration (default: false)
- `--better-auth-url, -u`: URL for Better Auth service (default: localhost:3000)
- `--user-map-file`: Path to a JSON file providing a manual Supabase→Convex user ID map. The file must be an object of the form `{ "<supabaseUserId>": "<convexUserId>", ... }`. Especially useful together with `--skip-users`.

### Migration Sections

- `users`: Migrate users to Convex users table
- `tasks`: Migrate tasks
- `friendRequests`: Migrate friend requests
- `friendships`: Migrate friendships (derived from accepted requests)
- `pinnedFriends`: Migrate pinned friends from dashboard configs
- `friendPermissions`: Migrate friend permissions
- `betterAuth`: Migrate users and accounts to Better Auth (requires `--migrate-to-better-auth`)

## Migration Flow

### 1. Better Auth Migration (if enabled)

When `--migrate-to-better-auth` is enabled:

1. **Users**: Migrated to Better Auth with preserved metadata
2. **Accounts**: Social provider and credential accounts are preserved
3. **Sessions**: Will be created when users first sign in
4. **Verification**: Email verification status is preserved

### 2. Convex Table Migration

Standard migration of application data:

1. **Users**: Basic user information for app functionality
2. **Tasks**: User tasks with relationships
3. **Friendships**: Social connections
4. **Permissions**: Access control settings

## Better Auth Integration

The script integrates with your existing Better Auth setup:

- Uses existing `betterAuthComponent` from `convex/auth.ts`
- Preserves original Supabase user IDs in metadata
- Handles both email/password and social provider accounts
- Maintains email verification status

## Dry Run Mode

Use `--dry-run` to test migrations without affecting production:

```bash
npx tsx scripts/supabaseToConvex.ts --dry-run --migrate-to-better-auth
```

This will:

- Generate JSON files in the output directory
- Show what would be migrated
- Not make any API calls to Convex or Better Auth

## Error Handling

The script provides comprehensive error reporting:

- **Migration Counts**: Successfully migrated items
- **Error Counts**: Failed migrations with details
- **Skipped Items**: Items that couldn't be migrated
- **Detailed Logs**: Console output for debugging

## Post-Migration Steps

After running the migration:

1. **Verify Better Auth**: Check that users can sign in
2. **Test Functionality**: Ensure app features work correctly
3. **Update Client Code**: Switch from Supabase auth to Better Auth
4. **Clean Up**: Remove old Supabase auth code

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check `MIGRATION_SECRET` environment variable
2. **Database Connection**: Verify `PG_CONNECTION_STRING` is correct
3. **Convex URL**: Ensure `CONVEX_URL` points to your deployment
4. **Better Auth Setup**: Verify Better Auth is properly configured

### Debug Mode

Enable verbose logging by checking the console output for detailed migration information.

## Examples

### Full Migration with Better Auth

```bash
npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth
```

### Partial Migration

```bash
# Migrate only users and tasks to Better Auth
npx tsx scripts/supabaseToConvex.ts --migrate-to-better-auth betterAuth users tasks

# Migrate everything except Better Auth
npx tsx scripts/supabaseToConvex.ts users tasks friendRequests friendships

# Re-run data migrations using an existing user mapping (skip migrating users)
npx tsx scripts/supabaseToConvex.ts --skip-users --user-map-file ./migration_out/users-map.json tasks friendRequests friendPermissions pinnedFriends
```

### Testing

```bash
# Test Better Auth migration without affecting production
npx tsx scripts/supabaseToConvex.ts --dry-run --migrate-to-better-auth betterAuth

# Test specific sections
npx tsx scripts/supabaseToConvex.ts --dry-run tasks friendRequests
```

## Architecture

The script follows a modular design:

- **Migration Functions**: Handle specific data types
- **HTTP Endpoints**: Secure Convex API endpoints
- **Batch Processing**: Efficient handling of large datasets
- **Error Recovery**: Continues processing on individual failures
- **Reporting**: Comprehensive migration summaries

## Security

- All migration endpoints require `MIGRATION_SECRET`
- Database connections use environment variables
- No sensitive data is logged in production mode
- Dry run mode prevents accidental changes
