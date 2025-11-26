import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// In-memory storage fallback for environments where localStorage is restricted (like iframes or workers)
const inMemoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : inMemoryStorage,
      persistSession: true,
    },
  }
);