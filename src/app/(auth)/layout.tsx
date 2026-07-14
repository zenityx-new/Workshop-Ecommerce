import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-lg font-semibold"
      >
        <Store className="size-6 text-primary" aria-hidden />
        ตลาดออนไลน์
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
