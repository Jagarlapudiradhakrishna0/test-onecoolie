require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;