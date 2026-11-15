-- A monthly spending cap per credit card (a guide only, nothing is blocked).
-- card_cap is the number the person chose; card_cap_dismissed_at remembers "Not now"
-- on the suggestion so it stops showing.
alter table simple_accounts add column if not exists card_cap numeric;
alter table simple_accounts add column if not exists card_cap_dismissed_at timestamptz;
