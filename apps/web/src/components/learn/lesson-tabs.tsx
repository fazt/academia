"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Discussion } from "./discussion";
import { ResourcesList } from "./resources-list";
import type { LearnChapter, LearnData } from "./types";

const TABS = ["descripcion", "recursos", "comentarios", "preguntas"] as const;
type TabValue = (typeof TABS)[number];

const isTab = (value: string | null): value is TabValue => TABS.includes(value as TabValue);

// Pestañas como la navegación de la portada: monoespaciada, en minúsculas y subrayado con el acento.
const triggerClass = "flex-none px-1 font-term text-[13px] after:bg-term-accent data-active:text-term-text";

export function LessonTabs({ chapter, instructor }: { chapter: LearnChapter; instructor: LearnData["instructor"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const tab: TabValue = isTab(param) ? param : "descripcion";

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "descripcion") params.delete("tab");
    else params.set("tab", value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <div className="-mx-5 overflow-x-auto overflow-y-hidden border-b border-term-border px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <TabsList variant="line" className="h-10 gap-3">
          <TabsTrigger value="descripcion" className={triggerClass}>
            descripción
          </TabsTrigger>
          <TabsTrigger value="recursos" className={triggerClass}>
            recursos
            {chapter.resources.length > 0 && (
              <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px]">
                {chapter.resources.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comentarios" className={triggerClass}>
            comentarios
          </TabsTrigger>
          <TabsTrigger value="preguntas" className={triggerClass}>
            preguntas
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="descripcion" className="space-y-8">
        {chapter.description.trim() ? (
          <p className="max-w-3xl text-base leading-relaxed whitespace-pre-line text-term-text/90">{chapter.description}</p>
        ) : (
          <p className="font-term text-[13px] text-term-muted">Esta clase no tiene descripción.</p>
        )}
        {instructor && (
          <div className="flex max-w-3xl items-center gap-4 rounded-[14px] border border-term-border bg-term-surface p-4">
            <UserAvatar name={instructor.name} image={instructor.image} className="size-12" />
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span className="rounded-full bg-term-accent px-2 py-0.5 font-term text-[11px] font-bold text-term-bg">
                instructor
              </span>
              <p className="font-semibold">{instructor.name}</p>
              {instructor.headline && <p className="text-sm text-term-muted">{instructor.headline}</p>}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="recursos" className="max-w-3xl">
        <ResourcesList chapterId={chapter.id} resources={chapter.resources} />
      </TabsContent>

      <TabsContent value="comentarios" className="max-w-3xl">
        {tab === "comentarios" && <Discussion key={`${chapter.id}-comment`} chapterId={chapter.id} kind="comment" />}
      </TabsContent>

      <TabsContent value="preguntas" className="max-w-3xl">
        {tab === "preguntas" && <Discussion key={`${chapter.id}-question`} chapterId={chapter.id} kind="question" />}
      </TabsContent>
    </Tabs>
  );
}
