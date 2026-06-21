# 📚 KDP Book Builder (AI Coloring & Activity Book Creator)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-blue.svg)](#)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%7C%20Edge%20Functions-green.svg)](#)
[![Stripe](https://img.shields.io/badge/Billing-Stripe%20Subscriptions-purple.svg)](#)

**KDP Book Builder** is a premium, full-stack web application designed to help creators generate, customize, and publish high-quality AI-generated coloring books, tracing activities, mazes, and storybooks directly to Amazon KDP (Kindle Direct Publishing). 

By leveraging cutting-edge models like OpenAI's `gpt-4o`/`dall-e-3` and Google's `gemini-1.5-flash` alongside a robust Supabase backend and Stripe billing system, users can easily bring their own API keys and produce print-ready PDFs conforming to standard KDP layout specifications.

---

## ✨ Key Features

### 1. Intelligent AI Generation Suite
*   **Dual AI Provider Support:** Seamlessly connect and toggle between OpenAI (`gpt-4o`, `dall-e-3`) and Google Gemini (`gemini-1.5-flash`) for text and image assets.
*   **AI Coloring Art & Puzzles:** Generate black-and-white coloring pages, maze illustrations, dot-to-dot puzzles, and tracing sheets directly from text prompts.
*   **Story & Prompt Continuity:** Automatically generate structured chapter text, titles, and scene descriptions in seconds.
*   **Reference Image Guidance:** Upload a reference image (saved securely to Supabase Storage) to guide the AI image generator, ensuring style and character consistency across pages.

### 2. Multi-Activity Workspace & Canvas
*   **Dynamic Page Layouts:** Assign multiple activity types per page: `coloring`, `tracing` (word practice), `story`, `maze`, `dot-to-dot`, or standard `image`.
*   **Cover Page Designers:** Fully customize individual front and back covers alongside the inner content pages.
*   **Inline Image Canvas Editor:** Edit, crop, and manipulate AI-generated illustrations directly in the browser. Supports safe CORS image-proxying.
*   **Layout Settings:** Configure font sizes (`10`, `11`, `12` pt) and margins to match physical printing standards.

### 3. Native KDP-Ready PDF & EPUB Export
*   **Trim Size Dimensions:** Export books in standard KDP sizes with pixel-perfect resolution and bleed margins:
    *   `8.5" x 11"` (Standard coloring book size)
    *   `6" x 9"` (Standard novel size)
    *   `5" x 8"` (Pocket size)
*   **High-Resolution Rendering:** Uses `jspdf` to compile high-quality PDF downloads ready for immediate upload to the Amazon KDP portal.

### 4. Subscription & Stripe Billing System
*   **Tiered Access Control:** Implements a multi-tier plan structure (Free, Pro, and Premium plans).
*   **Stripe Customer Portal:** Integrated checkout sessions and customer portal redirects managed via secure Supabase Edge Functions.
*   **Real-time Synchronization:** Dynamic webhook handler updates user subscription tiers in the Supabase database.

---

## 🛠️ Technology Stack

*   **Frontend:** React (v18), TypeScript, React Router Dom (v7), Tailwind CSS for premium UI styling, Lucide React icons, and `react-image-crop` for canvas manipulation.
*   **Backend & DB:** Supabase (PostgreSQL database, Row-Level Security, Database Migrations).
*   **Storage:** Supabase Storage (for persistent coloring and reference images).
*   **Edge Runtime:** Supabase Edge Functions (Deno) for secure serverless API calls, Stripe billing checkouts, webhook parsing, and CORS image proxying.
*   **Document Generation:** `jspdf` for printing layouts, canvas graphics compilation, and PDF rendering.

---

## 📂 Project Structure

```text
├── .github/                 # GitHub workflows & CI/CD
├── supabase/                # Supabase Backend Configuration
│   ├── functions/           # Edge Functions (Deno/TypeScript)
│   │   ├── create-checkout-session   # Stripe Checkout session initializer
│   │   ├── create-portal-session     # Stripe billing portal redirector
│   │   ├── generate-book-content     # Generates overall story layout/context
│   │   ├── generate-coloring-image   # DALL-E 3 image rendering endpoint
│   │   ├── generate-gemini-image     # Gemini image rendering endpoint
│   │   ├── generate-page-content     # Page-by-page AI text/story generator
│   │   ├── proxy-image               # Bypasses CORS for editing external images
│   │   ├── stripe-webhook            # Handles Stripe billing event sync
│   │   └── sync-users                # Keeps app profile users in sync with auth
│   └── migrations/          # SQL database schema and RLS policies
├── src/                     # React Frontend Application
│   ├── components/          # Reusable UI elements, modals, editors, and headers
│   ├── hooks/               # Custom React hooks for data fetching & AI logic
│   │   ├── useBookData.ts            # Fetches books and page states
│   │   ├── useBookGeneration.ts      # Connects frontend actions to AI generation
│   │   └── useBookPersistence.ts     # Handles auto-saves, uploads, and edits
│   ├── lib/                 # Core API & database connection files
│   │   ├── config.ts                 # Holds database URLs and credentials
│   │   └── supabase.ts               # Initialized Supabase client instance
│   ├── pages/               # Routed page layouts and views
│   │   ├── BookEditor/               # Main workspace, sidebar, and interactive canvas
│   │   ├── Dashboard/                # User dashboard listing books and active plans
│   │   ├── AdminDashboard.tsx        # Analytics and site administrator views
│   │   ├── Landing.tsx               # Marketing, features showcase, and CTA page
│   │   ├── Login.tsx                 # Client authentication
│   │   ├── Signup.tsx                # Client registration
│   │   └── StaticPage.tsx            # Terms of Service & Privacy policy renderer
│   ├── utils/               # Formatting, image, and document exporters
│   ├── App.tsx              # Main routing and global state controller
│   ├── main.tsx             # DOM bootstrapper
│   └── types.ts             # TypeScript type definitions
├── tailwind.config.js       # Utility CSS styles layout configuration
├── tsconfig.json            # TypeScript compiler options
└── package.json             # Dev scripts and dependency manager
```

---

## 🚀 Local Development Setup

To run KDP Book Builder locally on your machine, follow these steps:

### Prerequisites
- Node.js (v18 or higher)
- NPM or PNPM
- Supabase CLI installed and logged in (`supabase login`)
- A Stripe Developer Account (for billing integrations)

### 1. Clone & Install Frontend Dependencies
```bash
git clone https://github.com/numanmalik999/kdp-Dyad.git
cd kdp
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root of your project:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Deploy Supabase Migrations
Initialize your local database schema or push it directly to your remote Supabase instance:
```bash
# Link the CLI to your remote project
supabase link --project-ref your-project-ref

# Push database schema, RLS policies, and triggers to your project
supabase db push
```

### 4. Deploy Supabase Edge Functions
Set up your environment variables for the Edge Functions (API keys, secrets) using the Supabase CLI, then deploy:
```bash
# Set necessary environment secrets
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_PRO_PRICE_ID="price_..."
supabase secrets set STRIPE_PREMIUM_PRICE_ID="price_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# Deploy all Edge Functions
supabase functions deploy
```

### 5. Launch the Frontend
Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 💳 Stripe Integration & Subscription Setup

To enable pricing tables and customer checkouts:

1. **Create Products:** In your Stripe Dashboard, create two recurring monthly products:
   - **Pro Plan:** (e.g., $19.00/mo) for 10 books and 50 pages per book.
   - **Premium Plan:** (e.g., $49.00/mo) for unlimited books.
2. **Stripe Webhook:** Configure a Stripe webhook pointing to your Supabase Edge Function URL:
   `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
   Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. **Database RLS Policies:** Ensure that your migrations have set up the `profiles` and `subscriptions` tables with appropriate triggers for real-time synchronization.

For a full step-by-step Stripe webhook debugging and validation plan, check out the detailed [Stripe Setup Guide](file:///c:/Users/reemm/dyad-apps/kdp/STRIPE_SETUP.md).

---

## 📦 Production Builds

To compile and optimize your client bundle for production environments (like Vercel or Netlify):

```bash
# Builds the production assets under the `dist/` directory
npm run build

# Preview the local production build
npm run preview
```

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
