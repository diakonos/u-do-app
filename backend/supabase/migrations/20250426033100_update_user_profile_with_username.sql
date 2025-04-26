-- Trigger to call the function after a new user is created in auth.users
-- Drop the existing trigger first if it exists, to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to handle user updates, specifically username changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
BEGIN
  -- Check if the username in raw_user_meta_data has actually changed
  IF (new.raw_user_meta_data ->> 'username') IS DISTINCT FROM (old.raw_user_meta_data ->> 'username') THEN
    -- Update the username in the corresponding user_profiles record
    -- Use COALESCE again to handle potential nulls, though the trigger condition should prevent this
    UPDATE public.user_profiles
    SET username = COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
    WHERE user_id = new.id;
  END IF;
  RETURN new;
END;
$$;

-- Trigger to call the update function after a user's data is updated in auth.users
-- Drop the existing trigger first if it exists, to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();
