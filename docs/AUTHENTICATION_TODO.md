# Authentication Implementation TODO

This document outlines the current demo authentication setup and what needs to be done to implement real authentication.

## Current Demo Setup

The application currently uses a hardcoded demo user for development purposes:

- **Demo User ID**: `550e8400-e29b-41d4-a716-446655440000`
- **Demo Email**: `demo@example.com`
- **Demo Username**: `demo`

### Files Using Demo Authentication

The following files contain TODO comments and need to be updated when implementing real authentication:

1. **`/src/app/page.tsx`**
   - Contains `getCurrentUserId()` function that returns demo user ID
   - Needs to fetch real user from session/auth provider

2. **`/src/features/upload/UploadLanding.tsx`**
   - Uses `DEMO_USER_ID` as default prop
   - Should receive actual user ID from parent component

3. **`/src/features/editor/editor.tsx`**
   - Sets demo user ID in `useEffect` hook
   - Should get user ID from authentication context

4. **`/scripts/seed-demo-user.ts`**
   - Creates demo user in database
   - Can be kept for development but removed in production

5. **`/src/constants/auth.ts`**
   - Centralized authentication constants and helper functions
   - Replace all functions with real authentication logic

## Recommended Authentication Solutions

### Option 1: NextAuth.js (Recommended)
```bash
pnpm add next-auth @auth/drizzle-adapter
```

Benefits:
- Built for Next.js
- Supports many providers (Google, GitHub, etc.)
- Works with Drizzle ORM

### Option 2: Clerk
```bash
pnpm add @clerk/nextjs
```

Benefits:
- Easy setup
- Built-in UI components
- User management dashboard

### Option 3: Supabase Auth
```bash
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Benefits:
- Integrated with Supabase database
- Real-time subscriptions
- Row-level security

## Implementation Steps

1. **Choose an authentication provider**
2. **Install required packages**
3. **Set up authentication provider configuration**
4. **Create auth context/provider component**
5. **Update all files marked with TODO comments**
6. **Create login/signup pages**
7. **Implement middleware for protected routes**
8. **Update database schema if needed**
9. **Test authentication flow**
10. **Remove demo user references**

## Database Changes Required

The current `User` table schema supports authentication:

```sql
- id: UUID (primary key)
- email: VARCHAR(64) UNIQUE
- password: VARCHAR(64) nullable
- username: VARCHAR(64)
- avatar: TEXT
- provider: VARCHAR(32)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

You may need to add:
- `emailVerified`: TIMESTAMP
- `sessions` table for session management
- `accounts` table for OAuth providers

## Environment Variables to Add

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Testing

After implementing authentication:

1. Test user registration
2. Test user login
3. Test logout
4. Test protected routes
5. Test session persistence
6. Test OAuth providers (if applicable)
7. Remove `pnpm db:seed` from setup instructions

## Security Considerations

- Never commit real API keys or secrets
- Use environment variables for all sensitive data
- Implement rate limiting on auth endpoints
- Add CSRF protection
- Use secure session cookies
- Implement proper password hashing (already using bcrypt-ts)

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)