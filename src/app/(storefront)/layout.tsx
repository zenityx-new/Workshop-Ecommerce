import { SiteHeader } from "@/components/site-header";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground">
          &copy; 2026 ตลาดออนไลน์หลายร้านค้า
        </div>
      </footer>
    </>
  );
}
