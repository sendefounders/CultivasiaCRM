# Overview

This is a CRM (Customer Relationship Management) software designed for the telemarketing company Cultivasia. The application manages telemarketing calls, tracks customer interactions, handles upsell opportunities, records transactions, and monitors agent performance. It features a Monday.com-inspired sidebar interface with role-based access for admins and agents.

The system provides comprehensive call management capabilities including call tracking, customer information management, upsell workflows, and transaction recording. Admins can manage products, users, and view system-wide analytics, while agents can handle their assigned calls and view their performance metrics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture. It uses Vite as the build tool and development server, providing fast hot module replacement and optimized builds.

**UI Framework**: The application uses shadcn/ui components built on top of Radix UI primitives with Tailwind CSS for styling. This provides a consistent, accessible, and customizable design system.

**State Management**: React Query (TanStack Query) handles server state management, caching, and synchronization. Local component state is managed using React hooks.

**Routing**: Wouter provides lightweight client-side routing with protected routes that require authentication.

**Authentication**: Context-based authentication system with protected routes that redirect unauthenticated users to the login page.

## Backend Architecture
The backend follows a REST API architecture built with Express.js and TypeScript, providing a clear separation between API endpoints and business logic.

**Session Management**: Uses Passport.js with local strategy for authentication and express-session for session management. Sessions are stored in PostgreSQL using connect-pg-simple.

**Database Layer**: Drizzle ORM provides type-safe database operations with PostgreSQL. The schema defines users, calls, products, transactions, and call history with proper relationships.

**Security**: Password hashing uses Node.js crypto module with scrypt for secure password storage. Role-based access control distinguishes between admin and agent permissions.

**File Upload**: Multer middleware handles CSV file uploads for bulk call imports with validation and error handling.

## Data Storage
**Primary Database**: PostgreSQL database stores all application data including user accounts, call records, product catalog, transactions, and call history.

**Database Schema**: Well-structured relational schema with proper foreign key relationships and enums for status tracking. Uses UUID primary keys and timestamps for audit trails.

**Session Store**: PostgreSQL-backed session storage ensures session persistence across server restarts and supports horizontal scaling.

## Authentication and Authorization
**Authentication Method**: Custom username/password authentication using Passport.js local strategy. No third-party SSO integration to maintain simplicity.

**Password Security**: Passwords are hashed using scrypt with random salts for security. Timing-safe comparison prevents timing attacks.

**Role System**: Two-tier role system with 'admin' and 'agent' roles. Admins have full system access while agents can only manage their assigned calls.

**Session Security**: Secure session configuration with proper cookie settings and CSRF protection considerations.

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL database service for data persistence
- **@neondatabase/serverless**: Serverless PostgreSQL client for database connections

## UI Component Libraries
- **Radix UI**: Comprehensive set of low-level UI primitives for building the component system
- **shadcn/ui**: Pre-built component library based on Radix UI with Tailwind CSS styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design and theming

## Development Tools
- **Vite**: Fast build tool and development server with TypeScript support
- **TypeScript**: Type safety across the entire application stack
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations
- **React Query**: Server state management and caching solution

## Authentication & Security
- **Passport.js**: Authentication middleware with local strategy implementation
- **express-session**: Session management middleware for Express.js
- **connect-pg-simple**: PostgreSQL session store for persistent sessions

## File Processing
- **Multer**: Multipart/form-data handling for CSV file uploads
- **PapaParse**: CSV parsing library for processing call import files

## Data Visualization
- **Recharts**: React chart library for dashboard analytics and performance metrics