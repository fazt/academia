import { COURSE_LEVEL_LABELS } from "@academia/shared";
import { Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { CourseCover } from "@/components/course/course-cover";
import { RatingSummary } from "@/components/course/rating-stars";
import { formatDuration, formatPrice } from "@/lib/format";
import type { CourseCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CourseCard({ course, className }: { course: CourseCardData; className?: string }) {
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <div className="overflow-hidden">
        <CourseCover
          title={course.title}
          src={course.coverImageUrl}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-heading leading-snug font-semibold group-hover:text-primary">{course.title}</h3>
        <p className="text-xs text-muted-foreground">{course.instructor.name}</p>
        <RatingSummary avg={course.ratingAvg} count={course.ratingCount} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {formatDuration(course.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1">
            <PlayCircle className="size-3.5" /> {course.chaptersCount} clases
          </span>
          <span>{COURSE_LEVEL_LABELS[course.level]}</span>
        </div>
        <p className="mt-auto pt-2 font-heading text-lg font-bold">
          {formatPrice(course.priceCents, course.currency)}
        </p>
      </div>
    </Link>
  );
}

export function CourseGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>
  );
}
