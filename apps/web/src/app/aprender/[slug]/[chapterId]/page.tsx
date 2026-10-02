"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { LearnSkeleton } from "@/components/learn/learn-states";
import { LearnView } from "@/components/learn/learn-view";

export default function LessonPage() {
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  return (
    <Suspense fallback={<LearnSkeleton />}>
      <LearnView slug={slug} chapterId={chapterId} />
    </Suspense>
  );
}
