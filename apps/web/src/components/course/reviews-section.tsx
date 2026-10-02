"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { Star } from "lucide-react";
import { RatingStars } from "@/components/course/rating-stars";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, call } from "@/lib/api";
import { formatRelative } from "@/lib/format";

type ReviewsPage = InferResponseType<(typeof api.courses)[":slug"]["reviews"]["$get"], 200>;

export function ReviewsSection({
  slug,
  ratingAvg,
  ratingCount,
  initial,
}: {
  slug: string;
  ratingAvg: number;
  ratingCount: number;
  initial: ReviewsPage;
}) {
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", slug],
    queryFn: ({ pageParam }) =>
      call(api.courses[":slug"].reviews.$get({ param: { slug }, query: { page: String(pageParam), pageSize: "6" } })),
    initialPageParam: 1,
    initialData: { pages: [initial], pageParams: [1] },
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
  });

  const items = reviews.data.pages.flatMap((p) => p.items);
  const distribution = initial.distribution;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl font-bold">
        <Star className="size-6 fill-star text-star" />
        {ratingCount > 0 ? `${ratingAvg.toFixed(1)} · ${ratingCount} ${ratingCount === 1 ? "reseña" : "reseñas"}` : "Reseñas"}
      </h2>

      {ratingCount === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este curso aún no tiene reseñas. Los estudiantes inscritos pueden dejar la suya desde el aula.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {distribution.map((row) => {
              const pct = ratingCount ? Math.round((row.count / ratingCount) * 100) : 0;
              return (
                <div key={row.stars} className="flex items-center gap-2 text-sm">
                  <span className="w-3 tabular-nums">{row.stars}</span>
                  <Star className="size-3.5 fill-star text-star" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-star" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-5">
            {items.map((review) => (
              <article key={review.id} className="flex gap-3 border-b pb-5 last:border-0">
                <UserAvatar name={review.author.name} image={review.author.image} className="size-9" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold">{review.author.name}</p>
                  <div className="flex items-center gap-2">
                    <RatingStars value={review.rating} />
                    <span className="text-xs text-muted-foreground">{formatRelative(review.createdAt)}</span>
                  </div>
                  {review.body && <p className="text-sm whitespace-pre-line text-foreground/90">{review.body}</p>}
                </div>
              </article>
            ))}
            {reviews.hasNextPage && (
              <Button variant="outline" onClick={() => reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage}>
                {reviews.isFetchingNextPage && <Spinner />} Ver más reseñas
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
