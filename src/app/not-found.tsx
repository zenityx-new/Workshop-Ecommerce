import Link from "next/link";
import { PackageSearch, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <PackageSearch className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-4xl font-bold tracking-tight">404</p>
        <h1 className="text-lg font-semibold">ไม่พบหน้าที่คุณค้นหา</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          หน้านี้อาจถูกย้าย ลบไปแล้ว หรือลิงก์ไม่ถูกต้อง
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home aria-hidden />
          กลับสู่หน้าแรก
        </Link>
      </Button>
    </main>
  );
}
