import { createClient } from '@supabase/supabase-js';

// These should be environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Task = {
  id: number;
  created_at: string;
  updated_at: string;
  task_name: string;
  due_date: string | null;
  is_done: boolean;
  user_id: string;
  is_private: boolean;
  assigned_by: string | null;
};

export type UserProfile = {
  id: number;
  user_id: string;
  username: string | null;
  email: string | null;
};

export type FriendRequest = {
  id: number;
  created_at: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  updated_at: string | null;
};

export type Notification = {
  id: number;
  created_at: string;
  target_user_id: string;
  sender_user_id: string | null;
  type: number;
  delivery_status: number;
  title: string | null;
  message: string | null;
  read_status: boolean;
};
