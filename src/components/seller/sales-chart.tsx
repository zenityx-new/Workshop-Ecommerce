import { formatTHB } from "@/lib/format";

export type SalesPoint = { label: string; value: number };

/**
 * Lightweight vertical bar chart drawn with plain SVG/CSS — no chart library
 * (keeps the Cloudflare Workers bundle lean and avoids SSR/hydration quirks).
 * Renders server-side; each bar carries a <title> for hover + an sr-only value.
 */
export function SalesChart({ data }: { data: SalesPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        ยังไม่มียอดขายในช่วงนี้
      </div>
    );
  }

  return (
    <div className="flex h-56 items-end gap-1.5" role="img" aria-label="กราฟยอดขาย">
      {data.map((d) => {
        const heightPct = (d.value / max) * 100;
        return (
          <div
            key={d.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="text-[10px] font-medium text-muted-foreground">
              {d.value > 0 ? formatTHB(d.value) : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                style={{ height: `${Math.max(heightPct, d.value > 0 ? 2 : 0)}%` }}
                title={`${d.label}: ${formatTHB(d.value)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
