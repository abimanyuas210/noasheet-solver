# Overview

This is a screenshot capture service built as a full-stack web application. The system allows users to submit website URLs and receive automated screenshots through a queuing system. It features a React frontend with shadcn/ui components, an Express.js backend, and uses Puppeteer for web page capture. The application provides real-time status updates, queue management, and screenshot history tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **Routing**: wouter for client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: react-hook-form with Zod validation
- **Build System**: Vite with TypeScript compilation and hot module replacement

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints for screenshot operations, queue management, and statistics
- **Middleware**: Custom logging middleware for API request tracking
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Two main tables - screenshots and queue items with proper relationships
- **Migrations**: Drizzle Kit for database schema migrations
- **Storage Strategy**: In-memory storage implementation (MemStorage) for development with interface for future database integration

## Screenshot Processing
- **Engine**: Puppeteer for headless browser automation
- **Queue System**: Custom queue implementation for managing screenshot requests
- **File Storage**: Local filesystem storage for captured screenshots and thumbnails
- **Processing Flow**: Asynchronous processing with status tracking (pending → processing → completed/failed)

## Authentication & Session Management
- **Session Storage**: Uses connect-pg-simple for PostgreSQL session storage
- **User Identification**: Temporary user IDs generated client-side for session tracking
- **Multi-user Support**: Schema supports user-based screenshot filtering

## Real-time Features
- **Polling Strategy**: Client-side polling for queue status, screenshot completion, and statistics
- **Status Updates**: Real-time progress tracking with estimated completion times
- **Queue Position**: Live queue position updates for user feedback

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database using @neondatabase/serverless driver
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect support

## UI & Styling
- **Radix UI**: Comprehensive component library for accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system combining Radix UI and Tailwind

## Web Automation
- **Puppeteer**: Headless Chrome browser automation for screenshot capture
- **Browser Management**: Automated browser lifecycle with optimized settings for server environments

## Development Tools
- **Vite**: Fast build tool with TypeScript support and HMR
- **ESBuild**: JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **TSX**: TypeScript execution for development server

## Validation & Forms
- **Zod**: TypeScript-first schema validation library
- **React Hook Form**: Performant form library with minimal re-renders
- **Hookform Resolvers**: Integration layer between react-hook-form and Zod