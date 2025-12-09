# SkillPlus - Expert Learning Platform

Full-stack Learning Management PWA with AI Creation Studio and RAG Chatbot.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Global CSS Variables
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth (with SSR)
- **PWA**: Manifest + Service Worker
- **UI**: Custom components with Radix UI primitives & Lucide React

## Project Structure

```bash
/src
  /app
    /(admin)     # Admin/Instructor routes
    /(student)   # Student routes
    /api         # Server APIs (admin ops, AI generation)
  /components
    /ui          # Reusable UI components (Button, Card, etc.)
    /layout      # Layout components (Sidebar, etc.)
  /lib
    /auth        # Role definitions & RBAC
    /supabase    # Supabase clients (client/server/admin)
    /utils.ts    # CN utility
  /types         # Database & API types
/supabase
  /migrations    # Database schema migrations
  /policies      # RLS policies
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```
   *Note: If you encounter build errors with Next.js 16 / Turbopack, ensure your environment supports the latest versions or try `next build` without turbo if applicable.*

2. **Environment Variables**
   Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env.local
   ```

3. **Database Setup**
   Run the migrations in `supabase/migrations` against your Supabase project.
   - `001_initial_schema.sql`: Core tables
   - `002_ai_studio_schema.sql`: AI Studio tables
   - `003_rag_schema.sql`: RAG tables
   - `004_rls_policies.sql`: Row Level Security policies

4. **Service Role Key**
   Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` for Admin APIs to function (creating users, resetting passwords).

## Development

Run the development server:
```bash
npm run dev
```

## Features Implemented (Phase 1, 2 & 3)

- [x] PWA Foundation (Manifest, Service Worker)
- [x] Responsive Admin & Student Layouts
- [x] Database Schema (Core, AI, RAG)
- [x] Complex RLS Policies (Multi-tenant)
- [x] Role-Based Access Control (RBAC) Middleware
- [x] Admin User Management APIs (Create Student/Instructor, Reset Password)
- [x] **Admin Features**:
  - Instructor Management (List & Create with Service Role)
  - Student Management (List & Create)
  - Course Management (List, Create, Detail View with Tabs)
  - Audit Logs Viewer
  - Navigation & Sidebar Integration

## Next Steps (Phase 3+)

- [x] **Student Features (Phase 4)**:
  - Dashboard (Enrolled courses, Daily Plan placeholder)
  - Course Player (Sidebar navigation, Video/Text viewer)
  - Progress Tracking (Visual UI)
- [x] **AI Creation Studio (Phase 5/7)**:
  - Studio Dashboard (`/admin/studio`)
  - **SEO Article Generator**: Template-based generation logic.
  - **Thumbnail Creator**: Nanobanana integration (Mock UI).
  - AI Provider Abstraction (OpenAI / Gemini switchable).
- [x] **RAG Chatbot (Phase 6)**:
  - Floating Chat Widget in Course Player.
  - RAG API Endpoint (Mock context retrieval).
  - Integration with Course context.

## Next Steps (Production)

- Deploy to Vercel
- Configure real API keys for OpenAI/Gemini
- Set up Supabase Vector Store
- Implement real payment gateway (Stripe)
