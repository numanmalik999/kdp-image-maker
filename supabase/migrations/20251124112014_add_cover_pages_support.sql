/*
  # Add Cover Pages Support

  ## Changes
  1. Add columns to books table for cover page tracking
    - `has_front_cover` (boolean) - Whether the book has a front cover
    - `has_back_cover` (boolean) - Whether the book has a back cover
  
  2. Add columns to book_pages table for cover identification
    - `is_front_cover` (boolean) - Marks this page as the front cover
    - `is_back_cover` (boolean) - Marks this page as the back cover
  
  ## Notes
  - Covers are created once per book
  - Front cover and back cover are special pages with page_number 0 and -1 respectively
*/

-- Add cover tracking to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS has_front_cover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_back_cover boolean DEFAULT false;

-- Add cover identification to book_pages table
ALTER TABLE book_pages
ADD COLUMN IF NOT EXISTS is_front_cover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_back_cover boolean DEFAULT false;
