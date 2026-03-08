-- Admin page: case content tables for multi-case support
-- Run this migration against your Supabase project.

-- ============================================================================
-- ARCHETYPES (shared across cases)
-- ============================================================================

CREATE TABLE IF NOT EXISTS archetypes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    label       text NOT NULL,
    pressure_scale      float NOT NULL DEFAULT 1.0,
    rapport_scale       float NOT NULL DEFAULT 1.0,
    pressure_decay      float NOT NULL DEFAULT 1.0,
    rapport_decay       float NOT NULL DEFAULT 0.5,
    contradiction_bonus float NOT NULL DEFAULT 5.0,
    empathy_bonus       float NOT NULL DEFAULT 5.0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- CASES
-- ============================================================================

CREATE TABLE IF NOT EXISTS cases (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                 text NOT NULL UNIQUE,
    title                text NOT NULL,
    world_context_prompt text NOT NULL DEFAULT '',
    intuition_prompt     text NOT NULL DEFAULT '',
    partner_npc_slug     text,
    culprit_npc_slug     text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- NPCS
-- ============================================================================

CREATE TABLE IF NOT EXISTS npcs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    npc_slug         text NOT NULL,
    display_name     text NOT NULL,
    system_prompt    text NOT NULL DEFAULT '',
    timeline         text NOT NULL DEFAULT '',
    archetype_id     uuid REFERENCES archetypes(id),
    voice            text NOT NULL DEFAULT 'alloy',
    voice_instruction text NOT NULL DEFAULT '',
    gender           text NOT NULL DEFAULT 'male',
    sort_order       int NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE(case_id, npc_slug)
);

-- ============================================================================
-- EVIDENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    evidence_slug   text NOT NULL,
    label           text NOT NULL DEFAULT '',
    description     text NOT NULL DEFAULT '',
    evidence_group  text NOT NULL DEFAULT 'physical',
    sort_order      int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(case_id, evidence_slug)
);

-- ============================================================================
-- DISCOVERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS discoveries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    discovery_slug  text NOT NULL,
    npc_id          uuid NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    evidence_id     uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    description     text NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(case_id, discovery_slug)
);

-- ============================================================================
-- DISCOVERY GATES (OR logic across rows; AND within each row)
-- ============================================================================

CREATE TABLE IF NOT EXISTS discovery_gates (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_id             uuid NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
    gate_index               int NOT NULL DEFAULT 0,
    min_pressure             int,
    min_rapport              int,
    required_evidence_slugs  text[],
    required_discovery_slugs text[]
);

-- ============================================================================
-- LOCKED SECRET DESCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS locked_secret_descriptions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_id  uuid NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE UNIQUE,
    description   text NOT NULL DEFAULT ''
);

-- ============================================================================
-- NPC EVIDENCE RELEVANCE (+ smoking gun flag)
-- ============================================================================

CREATE TABLE IF NOT EXISTS npc_evidence_relevance (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id        uuid NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    evidence_id   uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    is_smoking_gun boolean NOT NULL DEFAULT false,
    UNIQUE(npc_id, evidence_id)
);

-- ============================================================================
-- CASE CONFIG (miscellaneous key-value per case)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_config (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id  uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    key      text NOT NULL,
    value    jsonb NOT NULL DEFAULT '{}',
    UNIQUE(case_id, key)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Helper function to check admin status from JWT
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN coalesce(
        (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE locked_secret_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_evidence_relevance ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_config ENABLE ROW LEVEL SECURITY;

-- Public read for game backend (uses service key)
CREATE POLICY "Public read archetypes" ON archetypes FOR SELECT USING (true);
CREATE POLICY "Public read cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Public read npcs" ON npcs FOR SELECT USING (true);
CREATE POLICY "Public read evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Public read discoveries" ON discoveries FOR SELECT USING (true);
CREATE POLICY "Public read discovery_gates" ON discovery_gates FOR SELECT USING (true);
CREATE POLICY "Public read locked_secret_descriptions" ON locked_secret_descriptions FOR SELECT USING (true);
CREATE POLICY "Public read npc_evidence_relevance" ON npc_evidence_relevance FOR SELECT USING (true);
CREATE POLICY "Public read case_config" ON case_config FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admin write archetypes" ON archetypes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write cases" ON cases FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write npcs" ON npcs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write evidence" ON evidence FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write discoveries" ON discoveries FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write discovery_gates" ON discovery_gates FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write locked_secret_descriptions" ON locked_secret_descriptions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write npc_evidence_relevance" ON npc_evidence_relevance FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write case_config" ON case_config FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON archetypes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON npcs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON discoveries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
