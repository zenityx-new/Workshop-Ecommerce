import Image from "next/image";
import { MessageSquareText, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  image_urls: string[];
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ProductReviews({ reviews }: { reviews: ProductReview[] }) {
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="size-5 text-primary" aria-hidden />
          รีวิวสินค้า
          {count > 0 && (
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Star className="size-4 fill-warning text-warning" aria-hidden />
              {avg.toFixed(1)} ({count} รีวิว)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรีวิวสำหรับสินค้านี้
          </p>
        ) : (
          <div className="divide-y">
            {reviews.map((review) => (
              <div key={review.id} className="space-y-2 py-4 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(review.created_at)}
                  </span>
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                {review.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.image_urls.map((url, i) => (
                      <div
                        key={i}
                        className="relative size-16 overflow-hidden rounded-lg border bg-muted"
                      >
                        <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                )}
                {review.seller_reply && (
                  <div className="rounded-md bg-muted/50 p-2.5 text-sm">
                    <p className="text-xs font-medium text-primary">ร้านค้าตอบกลับ</p>
                    <p className="text-muted-foreground">{review.seller_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
