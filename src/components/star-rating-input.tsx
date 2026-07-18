"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRatingInput({ defaultValue = 5 }: { defaultValue?: number }) {
  const [rating, setRating] = useState(defaultValue);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? rating;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name="rating" value={rating} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} ดาว`}
          onClick={() => setRating(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              n <= active ? "fill-warning text-warning" : "text-muted-foreground",
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
