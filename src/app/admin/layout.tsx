import { requireRole } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
