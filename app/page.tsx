import { redirect } from 'next/navigation';

/**
 * Root page — redirects to dashboard.
 * The dashboard layout handles session verification and role-based navigation.
 */
export default function Home() {
  redirect('/dashboard');
}
