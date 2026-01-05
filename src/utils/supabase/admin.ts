// utils/supabase/admin.ts
/**
 * Supabase admin client for backend-only usage.
 *
 * Uses the Service Role key to perform unrestricted database operations
 * in scripts, cron jobs, and AI batch processes.
 *
 * Must NOT be imported in request-based code (API routes, pages, components).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseSecretKey!
)
