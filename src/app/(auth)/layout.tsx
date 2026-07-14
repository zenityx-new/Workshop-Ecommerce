import { SiteHeader } from "@/components/site-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
