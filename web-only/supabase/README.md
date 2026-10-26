# Medha AI Supabase setup

This project uses the connected Supabase integration through the Express API
server. The mobile app must never contain a Supabase service key.

## Apply the foundation schema

1. Open the connected Supabase project.
2. Open the SQL Editor.
3. Run:

   `supabase/migrations/20260903000000_medha_foundation.sql`

4. Verify that the `profiles` table exists.
5. Check the API endpoint:

   `GET /api/supabase/status`

The endpoint should report:

```json
{
  "provider": "supabase",
  "connected": true,
  "schemaReady": true
}
```

Before the migration is applied, `connected` is true and `schemaReady` is
false. That is an intentional distinction so a missing schema is not mistaken
for a missing connection.

## Free-tier rules

- Keep audio and medical reports in private buckets.
- Do not seed real patient data into development.
- Keep the `TEST DATA — DELETE ME` profile separate from production.
- Avoid high-frequency polling; use focused queries and pagination.
- Do not add paid SMS, email, or observability services until explicitly
  approved.