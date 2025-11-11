// supabase-config.js

const SUPABASE_URL = 'https://fatembrelrsvjuyksopj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdGVtYnJlbHJzdmp1eWtzb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTk4NTksImV4cCI6MjA3NTgzNTg1OX0.XhIffC3Wy2eEzCBY5JpP2jib-UMxPKsgiwHFE_xSfRI';

// Acessa a função createClient do objeto global 'supabase' que foi carregado pelo script do CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY );

console.log('✅ Supabase configurado com sucesso!');
