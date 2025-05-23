import { supabase } from '@/lib/supabase';

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email,username')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}
