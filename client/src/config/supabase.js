/**
 * client/src/config/supabase.js
 *
 * Public client-side configuration for Supabase integration.
 * Only public project URL and publishable (anon) API keys are exposed here.
 * NEVER supply or import service role secret keys in client-side code!
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pzrttunhyfporcpcybax.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_dXyQiI56vk_nQF_l8DiysQ_sCa4bPt4';
