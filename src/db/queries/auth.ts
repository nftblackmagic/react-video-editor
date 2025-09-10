import { db } from "../index";
import { user, type User, type NewUser } from "../schema";
import { eq } from "drizzle-orm";
import { genSaltSync, hashSync, compareSync } from "bcrypt-ts";

// ==================== AUTH QUERIES ====================

/**
 * TODO: Implement proper authentication with NextAuth or similar
 * These are basic functions that need to be integrated with your auth provider
 */

/**
 * Hash a password
 */
export function hashPassword(password: string): string {
  const salt = genSaltSync(10);
  return hashSync(password, salt);
}

/**
 * Verify a password
 */
export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

/**
 * Create a new user
 * TODO: Add email verification, OAuth integration
 */
export async function createUser(data: Omit<NewUser, "id" | "createdAt" | "updatedAt">) {
  const hashedPassword = data.password ? hashPassword(data.password) : null;
  
  const [newUser] = await db
    .insert(user)
    .values({
      ...data,
      password: hashedPassword,
    })
    .returning();
  
  // Don't return password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Get user by email
 * TODO: Integrate with auth provider
 */
export async function getUserByEmail(email: string) {
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return foundUser;
}

/**
 * Get user by ID
 * TODO: Add caching
 */
export async function getUserById(id: string) {
  const [foundUser] = await db
    .select({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return foundUser;
}

/**
 * Update user profile
 * TODO: Add validation and sanitization
 */
export async function updateUserProfile(
  id: string,
  data: {
    username?: string;
    avatar?: string;
  }
) {
  const [updated] = await db
    .update(user)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(user.id, id))
    .returning({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  return updated;
}

/**
 * Authenticate user with email and password
 * TODO: Add rate limiting, session management
 */
export async function authenticateUser(email: string, password: string) {
  const foundUser = await getUserByEmail(email);
  
  if (!foundUser || !foundUser.password) {
    return null;
  }

  const isValid = verifyPassword(password, foundUser.password);
  
  if (!isValid) {
    return null;
  }

  // Don't return password
  const { password: _, ...userWithoutPassword } = foundUser;
  return userWithoutPassword;
}

/**
 * Delete user account
 * TODO: Add soft delete, data retention policies
 */
export async function deleteUser(id: string) {
  const [deleted] = await db
    .delete(user)
    .where(eq(user.id, id))
    .returning();
  return deleted;
}

/**
 * TODO: Implement these auth-related functions:
 * 
 * 1. OAuth provider integration (GitHub, Google, etc.)
 *    - createOAuthUser()
 *    - linkOAuthAccount()
 *    
 * 2. Session management
 *    - createSession()
 *    - validateSession()
 *    - revokeSession()
 *    
 * 3. Password reset
 *    - createPasswordResetToken()
 *    - resetPassword()
 *    
 * 4. Email verification
 *    - createEmailVerificationToken()
 *    - verifyEmail()
 *    
 * 5. Two-factor authentication
 *    - enable2FA()
 *    - verify2FACode()
 *    
 * 6. API key management (for programmatic access)
 *    - createAPIKey()
 *    - validateAPIKey()
 *    - revokeAPIKey()
 */