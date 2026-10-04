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
      <h2 className="mb-1 font-term text-2xl font-extrabold tracking-[-0.02em]">
        <span aria-hidden className="text-term-accent">#</span> Reseñas
      </h2>
      {ratingCount > 0 && (
        <p className="mb-4 inline-flex items-center gap-1.5 font-term text-[13px] text-term-muted">
          <Star aria-hidden className="size-3.5 fill-current text-term-num" strokeWidth={0} />
          <span className="font-bold text-term-num">{ratingAvg.toFixed(1)}</span>
          <span className="sr-only"> de 5 estrellas</span>· {ratingCount} {ratingCount === 1 ? "reseña" : "reseñas"}
        </p>
      )}

      {ratingCount === 0 ? (
        <p className="mt-4 rounded-[14px] border border-dashed border-term-border-strong p-6 text-center text-sm text-term-muted">
          Este curso aún no tiene reseñas. Los estudiantes inscritos pueden dejar la suya desde el aula.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {distribution.map((row) => {
              const pct = ratingCount ? Math.round((row.count / ratingCount) * 100) : 0;
              return (
                <div key={row.stars} className="flex items-center gap-2 font-term text-[13px]">
                  <span className="w-3 tabular-nums">{row.stars}</span>
                  <Star aria-hidden className="size-3.5 fill-current text-term-num" strokeWidth={0} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded bg-term-raised">
                    <div className="h-full rounded bg-term-num" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs text-term-muted tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col rounded-[14px] border border-term-border bg-term-surface">
              {items.map((review) => (
                <article key={review.id} className="flex gap-3 border-b border-term-border px-5 py-5 last:border-b-0">
                  <UserAvatar name={review.author.name} image={review.author.image} className="size-9" />
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold">{review.author.name}</p>
                    <div className="flex items-center gap-2">
                      <RatingStars value={review.rating} />
                      <span className="font-term text-xs text-term-muted">{formatRelative(review.createdAt)}</span>
                    </div>
                    {review.body && <p className="text-sm whitespace-pre-line text-term-text/90">{review.body}</p>}
                  </div>
                </article>
              ))}
            </div>
            {reviews.hasNextPage && (
              <Button variant="outline" onClick={() => reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage}>
                {reviews.isFetchingNextPage && <Spinner />} ver más reseñas
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
