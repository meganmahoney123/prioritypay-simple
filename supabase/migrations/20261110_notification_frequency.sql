-- How often deposit alerts are sent: 'instant' (every deposit, the old
-- behavior and still the default) or 'weekly' (one summary each Monday of
-- the deposits still waiting to be split). Applies to text, email and push.
alter table simple_profiles add column if not exists notification_frequency text not null default 'instant';
alter table simple_profiles drop constraint if exists simple_profiles_notification_frequency_check;
alter table simple_profiles add constraint simple_profiles_notification_frequency_check check (notification_frequency in ('instant', 'weekly'));
