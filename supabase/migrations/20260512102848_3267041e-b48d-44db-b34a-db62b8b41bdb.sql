ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_target numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_loss_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood text;