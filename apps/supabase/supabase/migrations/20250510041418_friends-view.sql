DROP VIEW IF EXISTS friends_view;

CREATE OR REPLACE VIEW friends_view AS
SELECT
CONCAT(f.requester_id,f.recipient_id) AS id,
f.requester_id AS user_id,
f.recipient_id AS friend_id,
u.username AS friend_username,
f.status,
f.created_at
FROM friend_requests f
INNER JOIN user_profiles u ON f.recipient_id = u.user_id
WHERE status = 'confirmed'
UNION ALL
SELECT
CONCAT(f.recipient_id,f.requester_id) AS id,
f.recipient_id AS user_id,
f.requester_id AS friend_id,
u.username AS friend_username,
f.status,
f.created_at
FROM friend_requests f
INNER JOIN user_profiles u ON f.requester_id = u.user_id
WHERE status = 'confirmed';

comment on view "friends_view" is e'@graphql({"primary_key_columns": ["id"]})';