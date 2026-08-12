-- The Appointment Booking Bot relies on an insert conflict to detect a
-- slot someone else just took (see bookAppointment in app/bots/actions.ts),
-- but the original table had no constraint to actually produce that
-- conflict — two concurrent bookings for the same account+time would both
-- silently succeed. This enforces it at the DB level.
alter table public.appointments
  add constraint appointments_user_slot_unique unique (user_id, scheduled_at);
