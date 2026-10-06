import { redirect } from 'next/navigation';
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  redirect(`/staff/prescriptions${status ? `?status=${encodeURIComponent(status)}` : ''}`);
}
