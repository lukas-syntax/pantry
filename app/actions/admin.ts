'use server';

import { db } from '@/db/drizzle';
import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session;
}

export async function getUsers() {
  await requireAdmin();

  return db.query.users.findMany({
    columns: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    },
    orderBy: (users, { asc }) => [asc(users.createdAt)],
  });
}

type AdminActionState = {
  error?: string;
  success?: string;
};

export async function createUserAsAdmin(
  _prevState: any,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const role = (formData.get('role') as string) || 'user';

    if (!username || username.length < 3) {
      return { error: 'Benutzername muss mindestens 3 Zeichen lang sein.' };
    }
    if (!password || password.length < 8) {
      return { error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
    }
    if (!name || name.length < 2) {
      return { error: 'Name muss mindestens 2 Zeichen lang sein.' };
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return { error: 'Ein Benutzer mit diesem Benutzernamen existiert bereits.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      username,
      passwordHash,
      name,
      role: role === 'admin' ? 'admin' : 'user',
      locale: 'de',
    });

    revalidatePath('/settings/users');
    return { success: `Benutzer "${username}" wurde erstellt.` };
  } catch (error) {
    console.error('Create user error:', error);
    return { error: 'Fehler beim Erstellen des Benutzers.' };
  }
}

export async function deleteUser(userId: string): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();

    if (userId === session.user.id) {
      return { error: 'Sie können Ihren eigenen Account nicht löschen.' };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { error: 'Benutzer nicht gefunden.' };
    }

    await db.delete(users).where(eq(users.id, userId));

    revalidatePath('/settings/users');
    return { success: `Benutzer "${user.username}" wurde gelöscht.` };
  } catch (error) {
    console.error('Delete user error:', error);
    return { error: 'Fehler beim Löschen des Benutzers.' };
  }
}

export async function resetUserPassword(
  _prevState: any,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireAdmin();

    const userId = formData.get('userId') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!newPassword || newPassword.length < 8) {
      return { error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { error: 'Benutzer nicht gefunden.' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath('/settings/users');
    return { success: `Passwort für "${user.username}" wurde zurückgesetzt.` };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: 'Fehler beim Zurücksetzen des Passworts.' };
  }
}
