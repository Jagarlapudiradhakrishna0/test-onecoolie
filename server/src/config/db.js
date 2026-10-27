require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV === 'test') {
    module.exports = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseKey || 'placeholder-key'
    );
    return;
  }
  throw new Error('FATAL: SUPABASE_URL and SUPABASE_SECRET_KEY must be configured in environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;