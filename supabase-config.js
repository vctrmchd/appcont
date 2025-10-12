// supabase-config.js
const SUPABASE_URL = 'https://fatembrelrsvjuyksopj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdGVtYnJlbHJzdmp1eWtzb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTk4NTksImV4cCI6MjA3NTgzNTg1OX0.XhIffC3Wy2eEzCBY5JpP2jib-UMxPKsgiwHFE_xSfRI';

// Criar cliente Supabase com configurações adicionais
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }
});

window.supabaseClient = supabase;
console.log('✅ Supabase configurado com sucesso!');
