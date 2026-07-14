import { requireUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

// Login is required for the whole /seller area. Fine-grained role checks
// (approved seller vs. applicant) are handled by the proxy and per page,
// so /seller/pending remains reachable by buyers who have applied.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
