-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert a new row into public.user_profiles, linking it to the new user
  -- and copying email and username from auth.users
  insert into public.user_profiles (user_id, email, username)
  values (new.id, new.email, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

