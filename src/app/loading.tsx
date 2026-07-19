import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="กำลังโหลด"
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 px-4"
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
    </div>
  );
}
