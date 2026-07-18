import Image from "next/image";
import { MessageSquareText, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ReplyForm } from "./reply-form";

export const metadata = { title: "รีวิวสินค้า" };

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

export default async function SellerReviewsPage() {
  const { user } = await requireRole("seller");
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  if (!shop) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          ไม่พบร้านค้าของคุณ
        </CardContent>
      </Card>
    );
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, product_id, rating, comment, image_urls, seller_reply, created_at")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  const rows = reviews ?? [];
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const imageUrl = (path: string) => supabase.storage.from("reviews").getPublicUrl(path).data.publicUrl;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageSquareText aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">รีวิวสินค้า</h1>
          <p className="text-sm text-muted-foreground">{rows.length} รีวิว</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <MessageSquareText className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">ยังไม่มีรีวิวสินค้าของร้านคุณ</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((review) => (
            <Card key={review.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {productNameById.get(review.product_id) ?? "สินค้า"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(review.created_at)}
                  </span>
                </div>
                <Stars rating={review.rating} />
                {review.comment && <p className="text-sm">{review.comment}</p>}
                {review.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.image_urls.map((path, i) => (
                      <div key={i} className="relative size-16 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={imageUrl(path)}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
                <ReplyForm reviewId={review.id} existingReply={review.seller_reply} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
