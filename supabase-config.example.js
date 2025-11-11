// ESTE ARQUIVO É APENAS UM EXEMPLO.
// CRIE UMA CÓPIA DESTE ARQUIVO CHAMADA 'supabase-config.js' E PREENCHA COM SUAS CHAVES REAIS.

const SUPABASE_URL = 'SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE_AQUI';

// Acessa a função createClient do objeto global 'supabase' que foi carregado pelo script do CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY );

console.log('✅ Supabase configurado com sucesso!');