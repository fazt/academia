import Link from "next/link";
import { CourseCard, CourseGrid } from "@/components/course/course-card";
import { SectionTitle, TermSection } from "@/components/layout/term";
import type { CourseCardData } from "@/lib/types";

export function CourseList({ courses, total }: { courses: CourseCardData[]; total: number }) {
  return (
    <TermSection id="cursos">
      <SectionTitle command="ls cursos/" aside="vista previa gratis en todos los cursos" />
      {courses.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-term-border-strong p-10 text-center text-term-muted">
          Pronto publicaremos los primeros cursos.
        </p>
      ) : (
        <CourseGrid>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
          <Link
            href="/cursos"
            className="flex min-h-[220px] flex-col justify-center gap-2.5 rounded-[14px] border border-dashed border-term-border-strong p-6 transition-colors hover:border-term-accent focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
          >
            <span className="font-term text-sm text-term-muted">ls cursos/ --all</span>
            <span className="text-[21px] leading-snug font-semibold">
              Ver el catálogo completo{total > courses.length ? ` (${total} cursos)` : ""}
            </span>
            <span className="font-term text-[13px] text-term-accent">buscar y filtrar →</span>
          </Link>
        </CourseGrid>
      )}
    </TermSection>
  );
}
