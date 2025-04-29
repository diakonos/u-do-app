alter table "public"."friend_requests" drop constraint "friend_requests_recipient_id_fkey";

alter table "public"."friend_requests" drop constraint "friend_requests_requester_id_fkey";

alter table "public"."tasks" drop constraint "tasks_user_id_fkey";

alter table "public"."friend_requests" add column "updated_at" timestamp without time zone;

alter table "public"."tasks" alter column "due_date" set data type date using "due_date"::date;

alter table "public"."friend_requests" add constraint "friend_requests_recipient_id_fkey1" FOREIGN KEY (recipient_id) REFERENCES user_profiles(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."friend_requests" validate constraint "friend_requests_recipient_id_fkey1";

alter table "public"."friend_requests" add constraint "friend_requests_requester_id_fkey1" FOREIGN KEY (requester_id) REFERENCES user_profiles(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."friend_requests" validate constraint "friend_requests_requester_id_fkey1";

alter table "public"."tasks" add constraint "tasks_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_user_id_fkey1";


