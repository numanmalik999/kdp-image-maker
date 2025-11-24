/*
  # Create Static Pages System

  ## Overview
  This migration creates a system for managing static content pages (Terms of Service,
  Privacy Policy, About Us, etc.) that can be displayed in the footer, header, or
  anywhere in the application.

  ## New Tables

  ### `static_pages`
  Stores static content pages managed by administrators.
  - `id` (uuid, primary key) - Unique page identifier
  - `title` (text) - Page title (e.g., "Terms of Service")
  - `slug` (text, unique) - URL-friendly identifier (e.g., "terms-of-service")
  - `content` (text) - Page content (supports markdown/HTML)
  - `display_location` (text[]) - Where to show links: 'footer', 'header', 'both', 'none'
  - `is_published` (boolean) - Whether page is publicly visible
  - `display_order` (integer) - Order in which links appear
  - `meta_description` (text) - SEO description
  - `created_by` (uuid, foreign key) - Admin who created the page
  - `created_at` (timestamptz) - Page creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  - Anyone can read published pages
  - Only admins can create, update, or delete pages
  - Unpublished pages only visible to admins

  ## Indexes
  - `static_pages.slug` - Fast lookup by URL slug
  - `static_pages.display_location` - Query pages by location
  - `static_pages.is_published` - Filter published pages

  ## Important Notes
  1. Slugs must be unique and URL-safe
  2. Display location uses PostgreSQL array type for flexibility
  3. Display order determines link sequence in navigation
  4. Unpublished pages can be previewed by admins only
*/

-- Create static_pages table
CREATE TABLE IF NOT EXISTS static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL DEFAULT '',
  display_location text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  meta_description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug);
CREATE INDEX IF NOT EXISTS idx_static_pages_display_location ON static_pages USING GIN(display_location);
CREATE INDEX IF NOT EXISTS idx_static_pages_published ON static_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_static_pages_display_order ON static_pages(display_order);

-- Enable Row Level Security
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

-- Published pages are readable by everyone
CREATE POLICY "Anyone can read published pages"
  ON static_pages FOR SELECT
  USING (is_published = true);

-- Admins can read all pages (including unpublished)
CREATE POLICY "Admins can read all pages"
  ON static_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert pages
CREATE POLICY "Admins can create pages"
  ON static_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update pages
CREATE POLICY "Admins can update pages"
  ON static_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete pages
CREATE POLICY "Admins can delete pages"
  ON static_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default static pages
INSERT INTO static_pages (title, slug, content, display_location, is_published, display_order, meta_description)
VALUES
  (
    'Terms of Service',
    'terms-of-service',
    '# Terms of Service

Last updated: ' || to_char(now(), 'Month DD, YYYY') || '

## 1. Acceptance of Terms

By accessing and using this KDP Coloring Books Creator service, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License

Permission is granted to use this service for creating coloring books for personal or commercial use. Users retain all rights to content they create.

## 3. Subscription Terms

- Free tier includes limited books and pages per month
- Paid subscriptions provide increased limits and features
- Subscriptions renew automatically unless cancelled
- Refunds available within 14 days of purchase

## 4. User Responsibilities

Users are responsible for:
- Maintaining account security
- Content they create and publish
- Compliance with Amazon KDP guidelines
- Not using the service for illegal purposes

## 5. Intellectual Property

- You retain rights to your created content
- Our AI-generated images are licensed for your commercial use
- You may not resell or redistribute the service itself

## 6. Limitation of Liability

We provide the service "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages.

## 7. Changes to Terms

We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.

## 8. Contact

For questions about these terms, please contact our support team.',
    ARRAY['footer'],
    true,
    1,
    'Terms of Service for KDP Coloring Books Creator'
  ),
  (
    'Privacy Policy',
    'privacy-policy',
    '# Privacy Policy

Last updated: ' || to_char(now(), 'Month DD, YYYY') || '

## Information We Collect

### Account Information
- Email address
- Name
- Payment information (processed securely by Stripe)

### Usage Data
- Books created
- Pages generated
- AI image generation usage
- Feature usage analytics

### Technical Data
- IP address
- Browser type
- Device information
- Cookies and similar technologies

## How We Use Your Information

We use collected information to:
- Provide and maintain our service
- Process payments and subscriptions
- Send service updates and support messages
- Improve our AI generation features
- Analyze usage patterns
- Prevent fraud and abuse

## Data Storage and Security

- All data stored securely in Supabase
- Encrypted connections (HTTPS)
- Regular security audits
- Payment data never stored on our servers

## Third-Party Services

We use:
- **Stripe** for payment processing
- **Supabase** for data storage
- **AI APIs** for image generation

Each has their own privacy policies.

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request data deletion
- Export your data
- Opt-out of marketing communications

## Data Retention

- Active accounts: data retained while account is active
- Cancelled subscriptions: data retained for 90 days
- Deleted accounts: data removed within 30 days

## Children''s Privacy

Our service is not intended for users under 13 years old. We do not knowingly collect data from children.

## Changes to Privacy Policy

We may update this policy periodically. Continued use constitutes acceptance of changes.

## Contact Us

For privacy-related questions, contact our privacy team.',
    ARRAY['footer'],
    true,
    2,
    'Privacy Policy for KDP Coloring Books Creator'
  ),
  (
    'About Us',
    'about',
    '# About Us

## Our Mission

We empower creators to easily design and publish professional coloring books for Amazon KDP. Our AI-powered platform makes it simple to create high-quality coloring pages without any design experience.

## What We Offer

### AI-Powered Creation
Generate beautiful, print-ready coloring page designs using advanced AI technology. Just describe what you want, and our AI brings it to life.

### Professional Output
Export your books as print-ready PDFs formatted perfectly for Amazon KDP specifications. No additional software needed.

### Flexible Plans
Start free and upgrade as your needs grow. From hobbyists to professional publishers, we have a plan for you.

## Our Story

Founded by creators who understand the challenges of self-publishing, we built this platform to remove technical barriers and let creativity flourish.

## Our Values

- **Simplicity** - Easy enough for beginners, powerful enough for pros
- **Quality** - Professional results every time
- **Fairness** - You own what you create
- **Support** - We''re here to help you succeed

## Technology

Built with modern web technologies and powered by cutting-edge AI, our platform is fast, reliable, and constantly improving.

## Join Our Community

Thousands of creators trust us to help bring their coloring book ideas to life. Start creating today!',
    ARRAY['footer'],
    true,
    3,
    'About KDP Coloring Books Creator - AI-powered coloring book creation platform'
  );
