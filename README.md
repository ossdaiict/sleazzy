# Sleazzy - Slot Booking Made Easy

A modern, full-featured venue slot booking system for university clubs and administrators. Built with React, TypeScript, and shadcn/ui components.

## Features

### For Clubs
- **Dashboard**: View global event schedule and your club's upcoming events
- **Book Slots**: Request venue bookings with real-time conflict detection
- **My Bookings**: Manage your reservations and submit post-event reports
- **Policy Page**: Access booking policies and guidelines

### For Administrators
- **Admin Dashboard**: Overview of pending requests and system statistics
- **Request Management**: Review and approve/reject venue booking requests
- **Master Schedule**: View complete event schedule (coming soon)

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS v4
- **Form Handling**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sleazzy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
src/
├── components/
│   └── ui/          # shadcn/ui components (Button, Card, Form, etc.)
├── lib/
│   ├── ClubDashboard.tsx
│   └── utils.ts      # Utility functions (cn helper)
├── pages/
│   ├── Login.tsx
│   ├── AdminDashboard.tsx
│   ├── AdminRequests.tsx
│   ├── BookSlot.tsx
│   ├── MyBookings.tsx
│   ├── PolicyPage.tsx
│   └── Layout.tsx
├── App.tsx           # Main app component with routing
├── types.ts          # TypeScript type definitions
├── constants.ts      # App constants (venues, clubs, etc.)
└── index.css         # Global styles and Tailwind configuration
```

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components, which are:

- **Accessible**: Built on Radix UI primitives
- **Customizable**: Copy-paste components you can modify
- **Type-safe**: Full TypeScript support
- **Styled**: Beautiful default styles with Tailwind CSS

### Installed Components

- Accordion
- Alert
- Avatar
- Badge
- Button
- Calendar
- Card
- Dialog
- Dropdown Menu
- Form (with React Hook Form integration)
- Input
- Label
- Popover
- Progress
- Select
- Separator
- Sheet
- Skeleton
- Tabs
- Tooltip

## Form Validation

Forms use React Hook Form with Zod for type-safe validation:

- **Login Form**: Email and password validation
- **Booking Form**: Event details, timeline, and conflict validation

## Environment Setup

Currently, the app uses mock data. To connect to a backend API:

1. Update API endpoints in the respective page components
2. Configure authentication tokens if needed
3. Update CORS settings if required

## Development Notes

- The app uses HashRouter for routing (useful for static hosting)
- All components follow shadcn/ui patterns and conventions
- Form validation is handled client-side with Zod schemas
- Responsive design with mobile-first approach

## License

Private project - All rights reserved

## Contributing

This is a private project. For questions or issues, please contact the project maintainer.
