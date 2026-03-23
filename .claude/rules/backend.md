# Backend Coding Rules

## API Routes

- All routes defined in dedicated `*_routes.py` files, mounted on the FastAPI app in `app.py`.
- Route handlers should be thin — delegate business logic to service functions or `interrogation.py`.
- Auth-protected routes use the Supabase token validation pattern from `auth_routes.py`.
- Multi-case endpoints accept a `case_id` query parameter; use `get_case(case_id)` which normalizes kebab/underscore formats.

## LLM Provider

- Never call an LLM directly — use the `server/llm/factory.py` abstraction.
- The provider is selected via environment config (`server/config.py`).
- `local_stub.py` exists for offline testing without API keys.

## Testing

- All tests in `tests/` directory, using pytest.
- Test files follow `test_<module>.py` naming convention.
- Use the fixtures in `tests/conftest.py` for app client and test data.

## Adding a New Case

1. Create a sub-package `server/cases/my_new_case/` with `__init__.py` exporting `case_data: CaseData`
2. Create matching frontend assets in `web/cases/my-new-case/` (case.js, i18n, portraits)
3. The case is auto-discovered at startup — no registration needed

## Review Checklist

- [ ] New endpoints have corresponding test coverage in `tests/`
- [ ] LLM calls go through the factory abstraction, not direct SDK calls
- [ ] Supabase operations use helpers from `supabase_helpers.py`
- [ ] Environment-specific config uses `server/config.py`, not hardcoded values
- [ ] New startup-dependent code works without ASGI lifespan (Vercel compatibility)
