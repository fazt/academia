import type { InferResponseType } from "hono/client";
import Link from "next/link";
import { SectionTitle, TermSection } from "@/components/layout/term";
import type { api } from "@/lib/api";

type FeaturedReview = InferResponseType<typeof api.reviews.featured.$get, 200>["items"][number];

const MAX_CHARS = 240;

/** Reseñas reales de alumnos, presentadas como un `git log`. Si no hay ninguna, la sección no se muestra. */
export function Testimonials({ reviews }: { reviews: FeaturedReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <TermSection>
      <SectionTitle command="git log --alumnos" />
      <div className="flex flex-col rounded-[14px] border border-term-border bg-term-surface">
        {reviews.map((review) => (
          <figure
            key={review.id}
            className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-b border-term-border px-6 py-5 last:border-b-0"
          >
            <span className="font-term text-[13px] text-term-num" aria-hidden>
              {review.id.replace(/-/g, "").slice(0, 7)}
            </span>
            <blockquote className="min-w-0 flex-[1_1_420px] text-lg">
              “{review.body.length > MAX_CHARS ? `${review.body.slice(0, MAX_CHARS).trimEnd()}…` : review.body}”
            </blockquote>
            <figcaption className="font-term text-[13px] text-term-muted">
              {review.author.name} ·{" "}
              <Link href={`/cursos/${review.course.slug}`} className="underline-offset-4 hover:text-term-text hover:underline">
                {review.course.title}
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>
    </TermSection>
  );
}
