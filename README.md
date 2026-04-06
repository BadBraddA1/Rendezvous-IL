# Rendezvous IL Website

A modern, mobile-first website for the Rendezvous Christian Homeschool Family Retreat, built with Next.js 16, React 19, and Tailwind CSS.

## Features

- Mobile-first responsive design
- Next.js 16 App Router
- React 19 with Server Components
- Tailwind CSS v4 for styling
- shadcn/ui component library
- Full registration system with database backend
- Admin dashboard for managing registrations
- Email notifications via Resend

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with Server Components
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **Neon** - Serverless PostgreSQL database
- **Resend** - Email delivery service

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:3000`

### Build for Production

Create an optimized production build:

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

## Project Structure

```
rendezvous-il/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── about/             # About page
│   ├── schedule/          # Schedule page
│   ├── registration/      # Registration page
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── admin/            # Admin components
│   └── registration/     # Registration form components
├── lib/                   # Utility functions
├── scripts/               # Database migration scripts
├── public/                # Static assets
└── docs/                  # Documentation
```

## Pages

- **Home** (`/`) - Event overview, countdown, and call-to-action
- **Schedule** (`/schedule`) - Complete 5-day event schedule
- **About** (`/about`) - Introduction and history of Rendezvous
- **Registration** (`/registration`) - Multi-step registration form
- **FAQ** (`/faq`) - Frequently asked questions
- **Calculator** (`/calculator`) - Registration cost calculator
- **Admin** (`/admin`) - Admin dashboard (protected)

## License

© 2025 Rendezvous Illinois. All rights reserved.

## Contact

Stephen & Ranae Bradd  
8754 Sunset Rd  
Clinton, IL 61727  
(217)935-5058  
Stephen@Bradd.us

Website: www.RendezvousIL.com  
Facebook: www.facebook.com/groups/RendezvousIL
