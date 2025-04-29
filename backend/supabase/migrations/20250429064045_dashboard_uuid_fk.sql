-- Change foreign key relationship from auth.users to public.user_profiles
ALTER TABLE public.dashboard_configs DROP CONSTRAINT IF EXISTS dashboard_configs_user_id_fkey;
ALTER TABLE public.dashboard_configs ADD CONSTRAINT dashboard_configs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;

-- Update comment to reflect the new relationship
COMMENT ON COLUMN public.dashboard_configs.user_id IS 'References the user profile who owns this dashboard config block';