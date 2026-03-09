'use server';

import { db } from '@/db/drizzle';
import { users } from '@/db/schema';
import { signUpSchema, updateUserProfileSchema } from '@/lib/validations';
import { signIn } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  const validationResult = signUpSchema.safeParse({
    username,
    password,
    name,
  });

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues[0].message);
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    throw new Error('Ein Benutzer mit diesem Benutzernamen existiert bereits');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // First user becomes admin, subsequent users are regular users
  const allUsers = await db.select().from(users);
  const role = allUsers.length === 0 ? 'admin' : 'user';

  await db.insert(users).values({
    username,
    passwordHash,
    name,
    role,
    locale: 'de',
  });

  await signIn('credentials', {
    username,
    password,
    redirectTo: '/dashboard',
  });
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name') as string;

  const validationResult = updateUserProfileSchema.safeParse({
    name,
  });

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues[0].message);
  }

  await db
    .update(users)
    .set({
      ...(name && { name }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath('/settings', 'page');
}

export async function signInUser(_prevState: any, formData: FormData): Promise<{ error?: string }> {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: '/dashboard',
    });
    return {};
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return { error: 'Benutzername oder Passwort ist falsch.' };
  }
}
