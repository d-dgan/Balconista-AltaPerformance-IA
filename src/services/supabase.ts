import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ---- Ticket Subscriptions (Realtime) ----
export function subscribeToTickets(orgId: string | number, callback: (payload: any) => void): RealtimeChannel {
  return supabase
    .channel(`tickets:org_${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets', filter: `organization_id=eq.${orgId}` },
      (payload) => callback(payload)
    )
    .subscribe();
}

// ---- Messages Subscription (Realtime) ----
export function subscribeToMessages(ticketId: string | number, callback: (payload: any) => void): RealtimeChannel {
  return supabase
    .channel(`messages:ticket_${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `ticket_id=eq.${ticketId}` },
      (payload) => callback(payload)
    )
    .subscribe();
}
