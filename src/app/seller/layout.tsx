import { requireUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SellerNav } from "@/components/seller-nav";

// Login is required for the whole /seller area. Fine-grained role checks
// (approved seller vs. applicant) are handled by the proxy and per page,
// so /seller/pending remains reachable by buyers who have applied.
// The seller nav only makes sense once approved, so it's hidden on the
// pending/apply screens.
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  return (
    <>
      <SiteHeader />
      {profile.role === "seller" && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <SellerNav />
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
