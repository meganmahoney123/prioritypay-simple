-- Total Category Cap: stop sending new money to a category once its running
-- total (starting balance + everything PrioritySave has recorded for it, minus
-- withdrawals) reaches this amount. Additive, nullable, safe to run any time.
alter table simple_split_rules_percent add column if not exists category_cap numeric;
