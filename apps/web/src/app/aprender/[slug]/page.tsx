"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LearnEmptyCourse, LearnErrorState, LearnSkeleton } from "@/components/learn/learn-states";
import { flattenChapters, learnQueryKey } from "@/components/learn/types";
import { api, call } from "@/lib/api";

/** Entra al curso: lleva al último capítulo visto o al primero con video. */
export default function LearnCourseEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data, error, refetch } = useQuery({
    queryKey: learnQueryKey(slug),
    queryFn: () => call(api.me.courses[":slug"].learn.$get({ param: { slug } })),
  });

  const chapters = data ? flattenChapters(data.sections) : [];
  const target =
    (data?.lastChapterId && chapters.find((c) => c.id === data.lastChapterId)) ||
    chapters.find((c) => c.hasVideo) ||
    chapters[0];

  const targetId = target?.id;
  useEffect(() => {
    if (targetId) router.replace(`/aprender/${slug}/${targetId}`);
  }, [targetId, slug, router]);

  if (error) return <LearnErrorState error={error} slug={slug} onRetry={() => void refetch()} />;
  if (data && !target) return <LearnEmptyCourse slug={slug} />;
  return <LearnSkeleton />;
}
