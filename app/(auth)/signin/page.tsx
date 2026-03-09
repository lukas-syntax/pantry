import { checkRegistrationAllowed } from '@/app/actions/registration';
import type { Metadata } from 'next';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In - Pantry',
};

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const canRegister = await checkRegistrationAllowed();

  return <SignInForm canRegister={canRegister} />;
}
