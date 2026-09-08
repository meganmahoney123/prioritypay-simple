-- PHASE V: let a subscriber cancel without deleting their account/data.
--
-- Previously the only way to stop billing was full account deletion
-- (app/api/account/delete -- cancels Stripe then deletes the Supabase
-- user, cascading away all their data) or Stripe's own hosted Billing
-- Portal (app/api/billing/portal), which has no in-app retention offer
-- and no way for PriorityPay's own UI to show "you're canceling, here's
-- when it ends." Requested by Megan directly: a lighter-weight "Cancel
-- subscription" action that keeps the account and its data, ends access
-- at the end of the period already paid for (not immediately), and shows
-- a one-time discount offer first.
--
-- cancel_at_period_end mirrors Stripe's own subscription field of the same
-- name -- true from the moment someone confirms cancellation (see
-- app/api/billing/cancel) until either they resume (app/api/billing/resume,
-- which flips it back to false) or the period actually ends, at which point
-- Stripe's customer.subscription.deleted webhook event fires and
-- subscription_status moves to 'canceled' (subscription_status already
-- existed pre-PHASE-V; cancel_at_period_end is what lets the UI show
-- "ending soon" for the stretch in between, since subscription_status
-- alone stays 'active' the whole time up to that point).
--
-- current_period_end is Stripe's own current_period_end for the
-- subscription, mirrored here so the Settings page can say the actual
-- date ("ends December 3") without a live Stripe API call on every page
-- load. Kept in sync by the same webhook handlers that already write
-- subscription_status (app/api/stripe/webhook) -- see that file for the
-- PHASE V additions to checkout.session.completed and
-- customer.subscription.updated/deleted.
alter table simple_profiles add column if not exists cancel_at_period_end boolean not null default false;
alter table simple_profiles add column if not exists current_period_end timestamptz;
-- One-time discount offer shown when someone starts canceling (see
-- app/api/billing/retention-offer) -- tracked so the same account can't
-- redeem it repeatedly across multiple cancel attempts. Defaults false for
-- every existing row (nobody's used it yet, by definition).
alter table simple_profiles add column if not exists retention_offer_used boolean not null default false;

