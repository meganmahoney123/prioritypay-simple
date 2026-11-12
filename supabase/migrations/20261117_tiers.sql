-- Tiers ("waterfall"). 1 = paid first, 2 = paid second, NULL = the last tier
-- (everything else). Each tier splits what reaches it by percent; tier 1 and 2
-- rows use `cap` as a required monthly cap.
alter table public.simple_split_rules_percent
  add column if not exists tier smallint;
notify pgrst, 'reload schema';
