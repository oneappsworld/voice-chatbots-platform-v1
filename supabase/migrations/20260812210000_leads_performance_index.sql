-- `leads` was the only user-scoped table without an index on user_id
-- (calls/appointments/handoffs all have one). Every RLS check
-- (`auth.uid() = user_id`, and `is_org_admin_of_user(user_id)` for the
-- admin analytics rollup) was doing a sequential scan as this table grows.
create index leads_user_created_idx on public.leads (user_id, created_at desc);
