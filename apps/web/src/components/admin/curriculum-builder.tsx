"use client";

import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  CloudOff,
  Eye,
  GripVertical,
  ListVideo,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StatusPill } from "@/components/admin/badges";
import { ChapterDialog, type ChapterDialogTarget } from "@/components/admin/chapter-dialog";
import { ChapterResources } from "@/components/admin/chapter-resources";
import { ChapterVideo } from "@/components/admin/chapter-video";
import { ConfirmAction } from "@/components/admin/confirm-button";
import type { AdminChapter, AdminCourse, AdminSection } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, call, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Order = { sectionId: string; chapterIds: string[] }[];

// Prefijos de id: la sección arrastrable ("s:") y su lista de capítulos soltable ("c:")
// necesitan ids distintos; los capítulos usan su propio id.
const sectionDragId = (id: string) => `s:${id}`;
const containerDropId = (id: string) => `c:${id}`;
const isSectionDrag = (id: string) => id.startsWith("s:");

const toOrder = (sections: AdminSection[]): Order =>
  sections.map((s) => ({ sectionId: s.id, chapterIds: s.chapters.map((c) => c.id) }));

const sameOrder = (a: Order, b: Order) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Al arrastrar una sección solo cuentan otras secciones; al arrastrar un
 * capítulo se prefieren los capítulos bajo el puntero y, si no hay, la lista
 * (para poder soltar en secciones vacías).
 */
const collisionDetection: CollisionDetection = (args) => {
  const draggingSection = isSectionDrag(String(args.active.id));
  const droppableContainers = args.droppableContainers.filter((c) =>
    draggingSection ? isSectionDrag(String(c.id)) : !isSectionDrag(String(c.id)),
  );
  if (draggingSection) return closestCenter({ ...args, droppableContainers });
  const within = pointerWithin({ ...args, droppableContainers });
  if (within.length) {
    const chapterHit = within.find((c) => !String(c.id).startsWith("c:"));
    return chapterHit ? [chapterHit] : within;
  }
  return closestCorners({ ...args, droppableContainers });
};

export function CurriculumBuilder({ course }: { course: AdminCourse }) {
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<Order>(() => toOrder(course.sections));
  const [syncedSections, setSyncedSections] = useState(course.sections);
  const orderRef = useRef(order);
  const snapshot = useRef<Order>(order);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<ChapterDialogTarget | null>(null);
  const [newSection, setNewSection] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  // Al llegar datos nuevos del servidor se recalcula el orden (salvo a mitad de un arrastre).
  if (course.sections !== syncedSections && !activeId) {
    setSyncedSections(course.sections);
    setOrder(toOrder(course.sections));
  }

  // Los manejadores de arrastre leen el orden más reciente desde la ref.
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const sectionsById = useMemo(() => new Map(course.sections.map((s) => [s.id, s])), [course.sections]);
  const chaptersById = useMemo(
    () => new Map(course.sections.flatMap((s) => s.chapters).map((c) => [c.id, c])),
    [course.sections],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "course", course.id] });

  const findSection = (id: string, current: Order = orderRef.current) => {
    if (id.startsWith("s:") || id.startsWith("c:")) return id.slice(2);
    return current.find((s) => s.chapterIds.includes(id))?.sectionId;
  };

  const persist = async (next: Order) => {
    setSaving(true);
    try {
      await call(
        api.admin.courses[":id"].curriculum.$put({
          param: { id: course.id },
          json: { sections: next.map((s) => ({ id: s.sectionId, chapterIds: s.chapterIds })) },
        }),
      );
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setOrder(snapshot.current);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    snapshot.current = orderRef.current;
    setActiveId(String(active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const activeKey = String(active.id);
    if (!over || isSectionDrag(activeKey)) return;
    const from = findSection(activeKey);
    const to = findSection(String(over.id));
    if (!from || !to || from === to) return;
    // Mueve el capítulo a la otra sección mientras se arrastra.
    setOrder((current) => {
      const target = current.find((s) => s.sectionId === to);
      if (!target) return current;
      const overIndex = target.chapterIds.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : target.chapterIds.length;
      return current.map((s) => {
        if (s.sectionId === from) return { ...s, chapterIds: s.chapterIds.filter((id) => id !== activeKey) };
        if (s.sectionId === to) {
          const ids = s.chapterIds.filter((id) => id !== activeKey);
          return { ...s, chapterIds: [...ids.slice(0, insertAt), activeKey, ...ids.slice(insertAt)] };
        }
        return s;
      });
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) {
      setOrder(snapshot.current);
      return;
    }
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const current = orderRef.current;
    let next = current;

    if (isSectionDrag(activeKey)) {
      const fromIndex = current.findIndex((s) => sectionDragId(s.sectionId) === activeKey);
      const toIndex = current.findIndex((s) => s.sectionId === findSection(overKey, current));
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) next = arrayMove(current, fromIndex, toIndex);
    } else {
      const sectionId = findSection(activeKey, current);
      if (sectionId && sectionId === findSection(overKey, current)) {
        next = current.map((s) => {
          if (s.sectionId !== sectionId) return s;
          const oldIndex = s.chapterIds.indexOf(activeKey);
          const newIndex = s.chapterIds.indexOf(overKey);
          return newIndex >= 0 && oldIndex !== newIndex ? { ...s, chapterIds: arrayMove(s.chapterIds, oldIndex, newIndex) } : s;
        });
      }
    }

    setOrder(next);
    if (!sameOrder(next, snapshot.current)) void persist(next);
  };

  const addSection = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newSection.trim();
    if (!title) return;
    setAddingSection(true);
    try {
      await call(api.admin.courses[":id"].sections.$post({ param: { id: course.id }, json: { title } }));
      setNewSection("");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAddingSection(false);
    }
  };

  const activeSection = activeId && isSectionDrag(activeId) ? sectionsById.get(activeId.slice(2)) : undefined;
  const activeChapter = activeId && !isSectionDrag(activeId) ? chaptersById.get(activeId) : undefined;

  return (
    <div className="space-y-4">
      {!course.streamConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium">Cloudflare Stream no está configurado</p>
            <p className="text-muted-foreground">
              Puedes organizar el currículo, pero para subir videos define CLOUDFLARE_ACCOUNT_ID y
              CLOUDFLARE_STREAM_API_TOKEN en la API y ejecuta <code className="font-mono">pnpm stream:setup</code>.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Arrastra con el asa para reordenar. Los capítulos se pueden mover entre secciones.</p>
        {saving && (
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <Spinner className="size-3.5" /> Guardando orden…
          </span>
        )}
      </div>

      {order.length === 0 ? (
        <Card className="py-0">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListVideo />
              </EmptyMedia>
              <EmptyTitle>El curso aún no tiene secciones</EmptyTitle>
              <EmptyDescription>Crea la primera sección (por ejemplo, «Introducción») y añade capítulos.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setOrder(snapshot.current);
          }}
        >
          <SortableContext items={order.map((s) => sectionDragId(s.sectionId))} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {order.map((entry, index) => {
                const section = sectionsById.get(entry.sectionId);
                if (!section) return null;
                const chapters = entry.chapterIds
                  .map((id) => chaptersById.get(id))
                  .filter((c): c is AdminChapter => !!c);
                return (
                  <SortableSection
                    key={section.id}
                    courseId={course.id}
                    index={index}
                    section={section}
                    chapters={chapters}
                    streamConfigured={course.streamConfigured}
                    onAddChapter={() => setDialog({ mode: "create", sectionId: section.id, sectionTitle: section.title })}
                    onEditChapter={(chapter) =>
                      setDialog({
                        mode: "edit",
                        chapterId: chapter.id,
                        values: { title: chapter.title, description: chapter.description, isFreePreview: chapter.isFreePreview },
                      })
                    }
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeSection ? (
              <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 font-medium shadow-xl">
                <GripVertical className="size-4 text-muted-foreground" />
                {activeSection.title}
              </div>
            ) : activeChapter ? (
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-xl">
                <GripVertical className="size-4 text-muted-foreground" />
                {activeChapter.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <form onSubmit={addSection} className="flex flex-col gap-2 rounded-xl border border-dashed p-4 sm:flex-row">
        <Input
          value={newSection}
          onChange={(event) => setNewSection(event.target.value)}
          placeholder="Título de la nueva sección"
          maxLength={120}
          aria-label="Título de la nueva sección"
        />
        <Button type="submit" disabled={!newSection.trim() || addingSection} className="shrink-0">
          {addingSection ? <Spinner /> : <Plus />} Añadir sección
        </Button>
      </form>

      <ChapterDialog courseId={course.id} target={dialog} onOpenChange={(open) => !open && setDialog(null)} />
    </div>
  );
}

function SortableSection({
  courseId,
  index,
  section,
  chapters,
  streamConfigured,
  onAddChapter,
  onEditChapter,
}: {
  courseId: string;
  index: number;
  section: AdminSection;
  chapters: AdminChapter[];
  streamConfigured: boolean;
  onAddChapter: () => void;
  onEditChapter: (chapter: AdminChapter) => void;
}) {
  const queryClient = useQueryClient();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: sectionDragId(section.id),
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerDropId(section.id) });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const duration = chapters.reduce((sum, c) => sum + (c.videoStatus === "ready" ? c.durationSec : 0), 0);

  const saveTitle = async () => {
    const value = title.trim();
    if (!value || value === section.title) {
      setTitle(section.title);
      setEditing(false);
      return;
    }
    setSavingTitle(true);
    try {
      await call(api.admin.sections[":id"].$patch({ param: { id: section.id }, json: { title: value } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
      setEditing(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingTitle(false);
    }
  };

  const remove = async () => {
    try {
      await call(api.admin.sections[":id"].$delete({ param: { id: section.id } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
      toast.success("Sección eliminada");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("rounded-xl border bg-card", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Mover sección ${section.title}`}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">Sección {index + 1}</span>
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTitle();
            }}
          >
            <Input
              value={title}
              autoFocus
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setTitle(section.title);
                  setEditing(false);
                }
              }}
              className="h-7"
              aria-label="Título de la sección"
            />
            <Button type="submit" size="icon-sm" variant="ghost" disabled={savingTitle} aria-label="Guardar título">
              {savingTitle ? <Spinner /> : <Check />}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setTitle(section.title);
                setEditing(false);
              }}
              aria-label="Cancelar"
            >
              <X />
            </Button>
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 truncate font-heading font-semibold">{section.title}</h3>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"} · {formatDuration(duration)}
            </span>
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Renombrar sección">
              <Pencil />
            </Button>
            <ConfirmAction
              destructive
              title="¿Borrar esta sección?"
              description={
                chapters.length
                  ? `Se borrarán también sus ${chapters.length} capítulos, con sus videos y recursos.`
                  : "La sección está vacía."
              }
              confirmLabel="Borrar sección"
              onConfirm={remove}
              trigger={
                <Button size="icon-sm" variant="ghost" aria-label="Borrar sección">
                  <Trash2 />
                </Button>
              }
            />
          </>
        )}
      </div>

      <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setDropRef}
          className={cn("min-h-12 space-y-2 p-3 transition-colors", isOver && "bg-primary/5")}
        >
          {chapters.length === 0 && (
            <li className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
              Sin capítulos. Añade uno o arrastra uno aquí.
            </li>
          )}
          {chapters.map((chapter, chapterIndex) => (
            <SortableChapter
              key={chapter.id}
              courseId={courseId}
              number={chapterIndex + 1}
              chapter={chapter}
              streamConfigured={streamConfigured}
              onEdit={() => onEditChapter(chapter)}
            />
          ))}
        </ul>
      </SortableContext>

      <div className="px-3 pb-3">
        <Button size="sm" variant="ghost" onClick={onAddChapter}>
          <Plus /> Añadir capítulo
        </Button>
      </div>
    </div>
  );
}

function SortableChapter({
  courseId,
  number,
  chapter,
  streamConfigured,
  onEdit,
}: {
  courseId: string;
  number: number;
  chapter: AdminChapter;
  streamConfigured: boolean;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  });
  const [showResources, setShowResources] = useState(false);

  const remove = async () => {
    try {
      await call(api.admin.chapters[":id"].$delete({ param: { id: chapter.id } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
      toast.success("Capítulo eliminado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("rounded-lg border bg-background", isDragging && "opacity-40")}
    >
      <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
            aria-label={`Mover capítulo ${chapter.title}`}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{number}.</span>
          <span className="min-w-0 truncate text-sm font-medium">{chapter.title}</span>
          {chapter.isFreePreview && (
            <StatusPill tone="primary" dot={false}>
              <Eye className="size-3" /> Preview
            </StatusPill>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 pl-9 sm:pl-0">
          <ChapterVideo courseId={courseId} chapter={chapter} streamConfigured={streamConfigured} />
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowResources((v) => !v)}
            aria-expanded={showResources}
          >
            <Paperclip /> {chapter.resources.length || ""}
            <ChevronDown className={cn("transition-transform", showResources && "rotate-180")} />
            <span className="sr-only">Recursos</span>
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label="Editar capítulo">
            <Pencil />
          </Button>
          <ConfirmAction
            destructive
            title="¿Borrar este capítulo?"
            description={`Se borrará «${chapter.title}» con su video, recursos, progreso y comentarios.`}
            confirmLabel="Borrar capítulo"
            onConfirm={remove}
            trigger={
              <Button size="icon-xs" variant="ghost" aria-label="Borrar capítulo">
                <Trash2 />
              </Button>
            }
          />
        </div>
      </div>
      {showResources && (
        <div className="border-t bg-muted/30 px-3 py-3 sm:pl-12">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Recursos descargables</p>
          <ChapterResources courseId={courseId} chapter={chapter} />
        </div>
      )}
    </li>
  );
}
