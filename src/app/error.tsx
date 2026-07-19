"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // log ไว้ฝั่ง client เพื่อช่วย debug — ไม่โชว์ stack ให้ผู้ใช้เห็น
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">เกิดข้อผิดพลาด</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          ระบบทำงานผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อทีมงาน
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>
        <RotateCw aria-hidden />
        ลองใหม่อีกครั้ง
      </Button>
    </main>
  );
}
