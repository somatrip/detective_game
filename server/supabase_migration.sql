-- ============================================================================
-- Supabase migration for "Echoes in the Atrium" game state persistence
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- This creates a single `game_saves` table keyed by Supabase Auth user ID.
-- Each row holds the full JSON game state blob (conversations, evidence,
-- discoveries, NPC interrogation gauges, tutorial flags, etc.).
-- ============================================================================

-- 1. Game saves table — one row per user
CREATE TABLE IF NOT EXISTS public.game_saves (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    -- Each user gets exactly one save slot (upsert-friendly)
    CONSTRAINT game_saves_user_unique UNIQUE (user_id)
);

-- 2. Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON public.game_saves(user_id);

-- 3. Auto-update the updated_at timestamp on every write
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.game_saves;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.game_saves
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Row Level Security — users can only access their own save
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own save"
    ON public.game_saves
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own save"
    ON public.game_saves
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own save"
    ON public.game_saves
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own save"
    ON public.game_saves
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
