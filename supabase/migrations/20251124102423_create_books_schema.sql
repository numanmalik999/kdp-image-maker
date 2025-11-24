/*
  # Create Books Management Schema

  ## Overview
  This migration creates the complete database schema for a book generation and management system.

  ## New Tables

  ### `profiles`
  Extends Supabase auth.users with additional user information.
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'user' or 'admin', defaults to 'user'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `books`
  Stores book metadata and settings.
  - `id` (uuid, primary key) - Unique book identifier
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `title` (text) - Book title
  - `author` (text) - Author name
  - `trim_size` (text) - Page size: '6x9', '5x8', or '8.5x11'
  - `font_size` (integer) - Font size: 10, 11, or 12
  - `target_pages` (integer) - Target number of pages
  - `status` (text) - 'draft', 'generating', or 'completed'
  - `book_prompt` (text) - AI generation prompt/description
  - `created_at` (timestamptz) - Book creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `book_pages`
  Stores individual page content and images.
  - `id` (uuid, primary key) - Unique page identifier
  - `book_id` (uuid, foreign key) - References books(id)
  - `page_number` (integer) - Page number in sequence
  - `content` (text) - Page text content
  - `image_url` (text) - URL to generated coloring page image
  - `created_at` (timestamptz) - Page creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `book_chapters`
  Stores chapter-based content organization.
  - `id` (uuid, primary key) - Unique chapter identifier
  - `book_id` (uuid, foreign key) - References books(id)
  - `chapter_number` (integer) - Chapter sequence number
  - `title` (text) - Chapter title
  - `content` (text) - Chapter text content
  - `created_at` (timestamptz) - Chapter creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with the following policies:

  #### profiles
  - Users can read their own profile
  - Users can update their own profile
  - Users can insert their own profile (on signup)
  - Admins can read all profiles

  #### books
  - Users can read their own books
  - Users can create their own books
  - Users can update their own books
  - Users can delete their own books
  - Admins can read all books

  #### book_pages
  - Users can read pages from their own books
  - Users can create pages in their own books
  - Users can update pages in their own books
  - Users can delete pages from their own books

  #### book_chapters
  - Users can read chapters from their own books
  - Users can create chapters in their own books
  - Users can update chapters in their own books
  - Users can delete chapters from their own books

  ## Indexes
  - `books.user_id` - Fast lookup of user's books
  - `books.status` - Filter books by status
  - `book_pages.book_id` - Fast lookup of book's pages
  - `book_pages.page_number` - Ordered page retrieval
  - `book_chapters.book_id` - Fast lookup of book's chapters
  - `book_chapters.chapter_number` - Ordered chapter retrieval

  ## Important Notes
  1. All foreign keys have CASCADE delete to maintain referential integrity
  2. Timestamps use `now()` as default for automatic tracking
  3. RLS policies ensure users can only access their own data
  4. Admin role can view all data for management purposes
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  trim_size text NOT NULL DEFAULT '8.5x11' CHECK (trim_size IN ('6x9', '5x8', '8.5x11')),
  font_size integer NOT NULL DEFAULT 12 CHECK (font_size IN (10, 11, 12)),
  target_pages integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed')),
  book_prompt text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create book_pages table
CREATE TABLE IF NOT EXISTS book_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  content text DEFAULT '',
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(book_id, page_number)
);

-- Create book_chapters table
CREATE TABLE IF NOT EXISTS book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(book_id, chapter_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_book_pages_book_id ON book_pages(book_id);
CREATE INDEX IF NOT EXISTS idx_book_pages_page_number ON book_pages(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_book_chapters_book_id ON book_chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_chapter_number ON book_chapters(book_id, chapter_number);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Books policies
CREATE POLICY "Users can read own books"
  ON books FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own books"
  ON books FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own books"
  ON books FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all books"
  ON books FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Book pages policies
CREATE POLICY "Users can read own book pages"
  ON book_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_pages.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own book pages"
  ON book_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_pages.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own book pages"
  ON book_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_pages.book_id AND books.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_pages.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own book pages"
  ON book_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_pages.book_id AND books.user_id = auth.uid()
    )
  );

-- Book chapters policies
CREATE POLICY "Users can read own book chapters"
  ON book_chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_chapters.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own book chapters"
  ON book_chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_chapters.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own book chapters"
  ON book_chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_chapters.book_id AND books.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_chapters.book_id AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own book chapters"
  ON book_chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_chapters.book_id AND books.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_pages_updated_at
  BEFORE UPDATE ON book_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_chapters_updated_at
  BEFORE UPDATE ON book_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
