// Reexporta o client canônico de src/services/supabase.ts — mantém esse
// caminho de import estável pras páginas que já existiam antes da fusão
// com o Tella Chat (LoginPage, ChatPage), garantindo uma única instância
// de client (e portanto um único estado de auth) em todo o app.
export { supabase } from './services/supabase';
