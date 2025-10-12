// supabase-config.js
// Configuração do Supabase para o projeto

const SUPABASE_URL = 'https://fatembrelrsvjuyksopj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdGVtYnJlbHJzdmp1eWtzb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTk4NTksImV4cCI6MjA3NTgzNTg1OX0.XhIffC3Wy2eEzCBY5JpP2jib-UMxPKsgiwHFE_xSfRI';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso global
window.supabaseClient = supabase;

console.log('✅ Supabase configurado com sucesso!');
