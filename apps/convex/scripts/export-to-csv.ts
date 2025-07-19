import { createClient } from '@supabase/supabase-js';
import { createObjectCsvWriter } from 'csv-writer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { mkdir } from 'fs/promises';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');

async function ensureDataDir() {
  try {
    await mkdir(dataDir, { recursive: true });
  } catch (error) {
    if ((error as any).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function exportTable(tableName: string, query: string = '*') {
  console.log(`Exporting ${tableName}...`);
  
  const { data, error } = await supabase
    .from(tableName)
    .select(query);

  if (error) {
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log(`No data found in ${tableName}`);
    return;
  }

  // Create CSV writer with headers based on the first row
  const headers = Object.keys(data[0]).map(key => ({
    id: key,
    title: key
  }));

  const csvWriter = createObjectCsvWriter({
    path: path.join(dataDir, `${tableName}.csv`),
    header: headers
  });

  await csvWriter.writeRecords(data);
  console.log(`Exported ${data.length} records from ${tableName}`);
}

async function main() {
  try {
    await ensureDataDir();

    // Export user profiles
    await exportTable('user_profiles');

    // Export tasks
    await exportTable('tasks');

    // Export friend requests
    await exportTable('friend_requests');

    // Export notifications
    await exportTable('notifications');

    // Export notification types
    await exportTable('notification_types');

    // Export notification delivery statuses
    await exportTable('notification_delivery_statuses');

    console.log('\nExport completed successfully!');
    console.log(`CSV files can be found in: ${dataDir}`);

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

main();
