-- Pay-per-message overage for the tax savings chat (web/Stripe customers only).
-- overage_limit_cents: the monthly spending limit the customer opted into (0 = not opted in).
-- overage_count: extra messages used beyond the monthly included messages this month.
-- overage_item_id: the pending Stripe invoice item that is kept up to date for the month.
alter table simple_advisor_usage add column if not exists overage_limit_cents integer not null default 0;
alter table simple_advisor_usage add column if not exists overage_count integer not null default 0;
alter table simple_advisor_usage add column if not exists overage_item_id text;
