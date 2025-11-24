import { createClient } from '@supabase/supabase-js';

// Hardcoded values from Supabase context to resolve environment variable loading issues.
const supabaseUrl = 'https://lrwjdykjaulwwdswuuoa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyd2pkeWtqYXVsd3dkc3d1dW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDY0NDcsImV4cCI6MjA3OTU4MjQ0N30.fH4hCKPAYSsdn-gBZy-KQ6PZYo3NCDDwUogzRDpV6OI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  trim_size: '6x9' | '5x8' | '8.5x11';
  font_size: 10 | 11 | 12;
  target_pages: number;
  status: 'draft' | 'generating' | 'completed';
  book_prompt: string | null;
  has_front_cover: boolean;
  has_back_cover: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookPage {
  id: string;
  book_id: string;
  page_number: number;
  content: string;
  image_url: string | null;
  is_front_cover: boolean;
  is_back_cover: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookChapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}