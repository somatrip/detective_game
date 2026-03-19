"""Unit tests for the interrogation engine (pressure/rapport mechanics)."""

import pytest

from server.interrogation import (
    ARCHETYPES,
    BASE_DELTAS,
    EVIDENCE_MULTIPLIERS,
    PressureBand,
    RapportBand,
    apply_update,
    compute_deltas,
    pressure_band,
    process_turn,
    rapport_band,
)

# ---------------------------------------------------------------------------
# Band mapping
# ---------------------------------------------------------------------------


class TestPressureBand:
    def test_calm(self):
        assert pressure_band(0) == PressureBand.CALM
        assert pressure_band(24) == PressureBand.CALM

    def test_tense(self):
        assert pressure_band(25) == PressureBand.TENSE
        assert pressure_band(49) == PressureBand.TENSE

    def test_shaken(self):
        assert pressure_band(50) == PressureBand.SHAKEN
        assert pressure_band(74) == PressureBand.SHAKEN

    def test_cornered(self):
        assert pressure_band(75) == PressureBand.CORNERED
        assert pressure_band(100) == PressureBand.CORNERED


class TestRapportBand:
    def test_cold(self):
        assert rapport_band(0) == RapportBand.COLD
        assert rapport_band(24) == RapportBand.COLD

    def test_neutral(self):
        assert rapport_band(25) == RapportBand.NEUTRAL
        assert rapport_band(49) == RapportBand.NEUTRAL

    def test_open(self):
        assert rapport_band(50) == RapportBand.OPEN
        assert rapport_band(74) == RapportBand.OPEN

    def test_trusting(self):
        assert rapport_band(75) == RapportBand.TRUSTING
        assert rapport_band(100) == RapportBand.TRUSTING


# ---------------------------------------------------------------------------
# Delta computation
# ---------------------------------------------------------------------------


class TestComputeDeltas:
    """Verify pressure/rapport delta math against known archetype values."""

    @pytest.fixture
    def proud_exec(self):
        return ARCHETYPES["proud_executive"]

    @pytest.fixture
    def anxious(self):
        return ARCHETYPES["anxious_insider"]

    @pytest.fixture
    def fixer(self):
        return ARCHETYPES["professional_fixer"]

    def test_open_ended_no_evidence(self, proud_exec):
        dp, dr = compute_deltas("open_ended", "none", proud_exec)
        # base: +3, +5 | evidence_mult=1.0 | p_scale=0.8, r_scale=0.7
        assert dp == round(3 * 1.0 * 0.8)  # 2
        assert dr == round(5 * 0.7)  # 4 (rounds to 4)

    def test_direct_accusation_smoking_gun(self, anxious):
        dp, dr = compute_deltas("direct_accusation", "smoking_gun", anxious)
        # base: +28, -12 | evidence_mult=3.0 | p_scale=1.3, r_scale=1.2
        assert dp == round(28 * 3.0 * 1.3)  # 109
        assert dr == round(-12 * 1.2)  # -14

    def test_empathy_adds_bonus(self, anxious):
        dp, dr = compute_deltas("empathy", "none", anxious)
        # base: -6, +15 | p_scale=1.3, r_scale=1.2, empathy_bonus=10
        assert dp == round(-6 * 1.0 * 1.3)  # -8
        assert dr == round(15 * 1.2 + 10.0)  # 28

    def test_contradiction_adds_bonus(self, fixer):
        dp, dr = compute_deltas("point_out_contradiction", "none", fixer)
        # base: +22, -7 | p_scale=0.9, r_scale=0.8, contradiction_bonus=10
        assert dp == round(22 * 1.0 * 0.9 + 10.0)  # 30
        assert dr == round(-7 * 0.8)  # -6

    def test_evidence_multiplier_strong(self, proud_exec):
        dp, dr = compute_deltas("present_evidence", "strong", proud_exec)
        # base: +15, +0 | evidence_mult=2.0 | p_scale=0.8
        assert dp == round(15 * 2.0 * 0.8)  # 24
        assert dr == round(0 * 0.7)  # 0

    def test_unknown_tactic_uses_fallback(self, proud_exec):
        dp, dr = compute_deltas("nonexistent_tactic", "none", proud_exec)
        # fallback base: (2, 3)
        assert dp == round(2 * 1.0 * 0.8)
        assert dr == round(3 * 0.7)

    def test_all_valid_tactics_have_deltas(self):
        """Every tactic in BASE_DELTAS produces a tuple."""
        for tactic in BASE_DELTAS:
            for strength in EVIDENCE_MULTIPLIERS:
                for archetype in ARCHETYPES.values():
                    dp, dr = compute_deltas(tactic, strength, archetype)
                    assert isinstance(dp, int)
                    assert isinstance(dr, int)


# ---------------------------------------------------------------------------
# Apply update (clamping + decay)
# ---------------------------------------------------------------------------


class TestApplyUpdate:
    @pytest.fixture
    def fixer(self):
        return ARCHETYPES["professional_fixer"]

    def test_clamp_to_zero(self, fixer):
        new_p, new_r, peak = apply_update(0, 0, -50, -50, fixer, peak_pressure=80)
        assert new_p == 0
        assert new_r == 0

    def test_clamp_to_hundred(self, fixer):
        new_p, new_r, peak = apply_update(90, 90, 50, 50, fixer, peak_pressure=90)
        assert new_p == 100
        assert new_r == 100

    def test_peak_pressure_tracks_max(self, fixer):
        new_p, _, peak = apply_update(50, 50, 30, 0, fixer, peak_pressure=60)
        assert peak == max(60, new_p)

    def test_peak_pressure_never_decreases(self, fixer):
        new_p, _, peak = apply_update(50, 50, -20, 0, fixer, peak_pressure=80)
        assert peak == 80  # stays at old peak even though pressure dropped

    def test_accelerated_decay_when_never_cornered(self, fixer):
        """When peak < 75 and delta_p <= 0, decay is multiplied by 4x."""
        # Normal decay: pressure_decay=2.0
        # Accelerated: 2.0 * 4.0 = 8.0
        new_p_accel, _, _ = apply_update(50, 50, 0, 0, fixer, peak_pressure=50)
        new_p_normal, _, _ = apply_update(50, 50, 1, 0, fixer, peak_pressure=50)
        # Accelerated should drop faster
        assert new_p_accel < new_p_normal

    def test_no_accelerated_decay_when_was_cornered(self, fixer):
        """When peak >= 75, normal decay applies even with delta_p <= 0."""
        new_p_cornered, _, _ = apply_update(50, 50, 0, 0, fixer, peak_pressure=80)
        new_p_not_cornered, _, _ = apply_update(50, 50, 0, 0, fixer, peak_pressure=50)
        # With peak >= 75, decay is normal (2.0) not accelerated (8.0)
        assert new_p_cornered > new_p_not_cornered

    def test_rapport_erodes_faster_under_pressure(self, fixer):
        """Rapport decay scales from 1x (pressure 0) to 3x (pressure 100)."""
        _, low_p_rapport, _ = apply_update(0, 50, 0, 0, fixer, peak_pressure=80)
        _, high_p_rapport, _ = apply_update(100, 50, 0, 0, fixer, peak_pressure=100)
        assert low_p_rapport > high_p_rapport


# ---------------------------------------------------------------------------
# Full turn processing
# ---------------------------------------------------------------------------


class TestProcessTurn:
    def test_returns_all_expected_fields(self):
        result = process_turn(
            tactic_type="open_ended",
            evidence_strength="none",
            npc_id="test-npc",
            current_pressure=25,
            current_rapport=50,
            peak_pressure=25,
            archetype_id="professional_fixer",
        )
        assert "pressure" in result
        assert "rapport" in result
        assert "pressure_band" in result
        assert "rapport_band" in result
        assert "archetype_id" in result
        assert "delta_pressure" in result
        assert "delta_rapport" in result
        assert "peak_pressure" in result

    def test_values_stay_in_range(self):
        """Pressure and rapport must always be 0-100 regardless of input."""
        for tactic in BASE_DELTAS:
            for strength in EVIDENCE_MULTIPLIERS:
                result = process_turn(
                    tactic_type=tactic,
                    evidence_strength=strength,
                    npc_id="test",
                    current_pressure=99,
                    current_rapport=1,
                    peak_pressure=99,
                    archetype_id="anxious_insider",
                )
                assert 0 <= result["pressure"] <= 100
                assert 0 <= result["rapport"] <= 100

    def test_band_strings_are_valid(self):
        result = process_turn(
            tactic_type="empathy",
            evidence_strength="none",
            npc_id="test",
            current_pressure=0,
            current_rapport=50,
            archetype_id="proud_executive",
        )
        assert result["pressure_band"] in {"calm", "tense", "shaken", "cornered"}
        assert result["rapport_band"] in {"cold", "neutral", "open", "trusting"}

    def test_unknown_archetype_falls_back_to_fixer(self):
        result = process_turn(
            tactic_type="open_ended",
            evidence_strength="none",
            npc_id="test",
            current_pressure=25,
            current_rapport=25,
            archetype_id="nonexistent_archetype",
        )
        assert result["archetype_id"] == "nonexistent_archetype"  # ID preserved
        # But should still compute valid results
        assert 0 <= result["pressure"] <= 100
