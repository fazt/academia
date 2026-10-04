"use client";

import type { CommentKind } from "@academia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, EyeOff, MessageCircleQuestion, MessagesSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TermPanel } from "@/components/layout/term";
import { UserAvatar } from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChapterComment, ChapterReply } from "./types";

const COPY: Record<
  CommentKind,
  { placeholder: string; submit: string; emptyTitle: string; emptyText: string; icon: React.ReactNode }
> = {
  comment: {
    placeholder: "Comparte un comentario sobre esta clase…",
    submit: "publicar comentario",
    emptyTitle: "Sin comentarios todavía",
    emptyText: "Sé el primero en compartir qué te pareció esta clase.",
    icon: <MessagesSquare />,
  },
  question: {
    placeholder: "¿Tienes una duda sobre esta clase? Explícala con detalle…",
    submit: "publicar pregunta",
    emptyTitle: "Nadie ha preguntado aún",
    emptyText: "Si algo no te quedó claro, pregunta: el instructor te responderá.",
    icon: <MessageCircleQuestion />,
  },
};

const MAX_LENGTH = 5000;

function Composer({
  placeholder,
  submitLabel,
  pending,
  initialValue = "",
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  pending: boolean;
  initialValue?: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!trimmed) return;
        try {
          await onSubmit(trimmed);
          setValue("");
        } catch {
          // El error ya se muestra con un toast en la mutación.
        }
      }}
    >
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        maxLength={MAX_LENGTH}
        rows={3}
        autoFocus={autoFocus}
        aria-label={placeholder}
      />
      <div className="flex items-center justify-end gap-2">
        {value.length > MAX_LENGTH * 0.8 && (
          <span className="mr-auto font-term text-xs text-term-muted">
            {value.length}/{MAX_LENGTH}
          </span>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!trimmed || pending}>
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function DeleteButton({ onConfirm, isReply }: { onConfirm: () => void; isReply: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="xs" className="text-term-muted">
          <Trash2 /> eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {isReply ? "esta respuesta" : "este mensaje"}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isReply ? "La respuesta se borrará de forma permanente." : "Se borrará junto con todas sus respuestas."}{" "}
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface MessageProps {
  message: ChapterComment | ChapterReply;
  isReply: boolean;
  currentUserId?: string;
  viewerIsAdmin: boolean;
  onEdit: (id: string, body: string) => Promise<unknown>;
  onDelete: (id: string) => void;
  editPending: boolean;
  actions?: React.ReactNode;
}

function Message({ message, isReply, currentUserId, viewerIsAdmin, onEdit, onDelete, editPending, actions }: MessageProps) {
  const [editing, setEditing] = useState(false);
  const isOwn = message.author.id === currentUserId;
  const isInstructor = message.author.role === "admin";
  const edited = new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 5_000;

  return (
    <div className={cn("flex gap-3", message.hidden && "opacity-70")}>
      <UserAvatar name={message.author.name} image={message.author.image} className={isReply ? "size-7" : "size-9"} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-term text-[13px]">
          <span className={cn("font-bold", isInstructor ? "text-term-accent" : "text-term-text")}>
            {message.author.name}
          </span>
          {isInstructor && (
            <span className="rounded-full bg-term-accent px-2 py-0.5 text-[11px] font-bold text-term-bg">instructor</span>
          )}
          {viewerIsAdmin && message.hidden && (
            <span className="inline-flex items-center gap-1 rounded-full border border-term-border-strong px-2 py-0.5 text-[11px] text-term-muted">
              <EyeOff className="size-3" aria-hidden /> oculto
            </span>
          )}
          <span className="text-xs text-term-muted">
            {formatRelative(message.createdAt)}
            {edited && " · editado"}
          </span>
        </div>
        {editing ? (
          <Composer
            placeholder="Edita tu mensaje"
            submitLabel="guardar"
            pending={editPending}
            initialValue={message.body}
            autoFocus
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              await onEdit(message.id, body);
              setEditing(false);
            }}
          />
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.body}</p>
        )}
        {!editing && (
          <div className="-ml-2 flex flex-wrap items-center gap-0.5">
            {actions}
            {isOwn && (
              <Button variant="ghost" size="xs" className="text-term-muted" onClick={() => setEditing(true)}>
                <Pencil /> editar
              </Button>
            )}
            {(isOwn || viewerIsAdmin) && <DeleteButton isReply={isReply} onConfirm={() => onDelete(message.id)} />}
          </div>
        )}
      </div>
    </div>
  );
}

type QuestionFilter = "all" | "open" | "resolved";

export function Discussion({ chapterId, kind }: { chapterId: string; kind: CommentKind }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user.id;
  const viewerIsAdmin = session?.user.role === "admin";
  const copy = COPY[kind];
  const queryKey = ["comments", chapterId, kind] as const;
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => call(api.chapters[":id"].comments.$get({ param: { id: chapterId }, query: { kind } })),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const onError = (err: unknown) => toast.error(errorMessage(err));

  const create = useMutation({
    mutationFn: (input: { body: string; parentId: string | null }) =>
      call(api.chapters[":id"].comments.$post({ param: { id: chapterId }, json: { ...input, kind } })),
    onSuccess: (_, input) => {
      if (input.parentId) setReplyingTo(null);
      void invalidate();
    },
    onError,
  });

  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      call(api.comments[":id"].$patch({ param: { id }, json: { body } })),
    onSuccess: () => void invalidate(),
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => call(api.comments[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      toast.success("Mensaje eliminado");
      void invalidate();
    },
    onError,
  });

  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      call(api.comments[":id"].resolve.$post({ param: { id }, json: { resolved } })),
    onSuccess: (_, { resolved }) => {
      toast.success(resolved ? "Pregunta marcada como resuelta" : "Pregunta reabierta");
      void invalidate();
    },
    onError,
  });

  // Enlaces directos a un hilo (#c-<id>), por ejemplo desde el email de respuesta.
  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#c-")) return;
    const element = document.getElementById(hash.slice(1));
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const id = hash.slice(3);
    const timer = setTimeout(() => setHighlighted(id), 0);
    const clear = setTimeout(() => setHighlighted(null), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, [data]);

  const items = (data?.items ?? []).filter((item) => {
    if (kind !== "question" || filter === "all") return true;
    return filter === "resolved" ? item.isResolved : !item.isResolved;
  });

  return (
    <div className="space-y-6">
      <Composer
        placeholder={copy.placeholder}
        submitLabel={copy.submit}
        pending={create.isPending && create.variables?.parentId === null}
        onSubmit={(body) => create.mutateAsync({ body, parentId: null })}
      />

      {kind === "question" && (data?.items.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar preguntas">
          {(
            [
              ["all", "todas"],
              ["open", "sin resolver"],
              ["resolved", "resueltas"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "secondary" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{errorMessage(error)}</p>
      ) : items.length === 0 ? (
        <Empty className="rounded-[14px] border border-dashed border-term-border-strong py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">{copy.icon}</EmptyMedia>
            <EmptyTitle>{filter === "all" ? copy.emptyTitle : "No hay preguntas con este filtro"}</EmptyTitle>
            {filter === "all" && <EmptyDescription>{copy.emptyText}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : (
        <TermPanel
          title={kind === "question" ? "preguntas/" : "comentarios/"}
          aside={
            <span className="shrink-0">
              {items.length} {items.length === 1 ? "hilo" : "hilos"}
            </span>
          }
        >
          <ul>
            {items.map((thread) => {
              const canResolve = kind === "question" && (thread.author.id === currentUserId || viewerIsAdmin);
              return (
                <li
                  key={thread.id}
                  id={`c-${thread.id}`}
                  className={cn(
                    "scroll-mt-24 border-b border-term-border px-4 py-5 transition-shadow last:border-b-0 sm:px-5",
                    highlighted === thread.id && "ring-2 ring-term-accent/60 ring-inset",
                  )}
                >
                  {kind === "question" && (
                    <div className="mb-3">
                      {thread.isResolved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklch,var(--term-ok)_14%,transparent)] px-2 py-0.5 font-term text-[11px] font-bold text-term-ok">
                          <Check className="size-3" strokeWidth={3} aria-hidden /> resuelta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-term-border-strong px-2 py-0.5 font-term text-[11px] text-term-muted">
                          <span aria-hidden className="size-1.5 rounded-full bg-term-num" /> sin resolver
                        </span>
                      )}
                    </div>
                  )}
                  <Message
                    message={thread}
                    isReply={false}
                    currentUserId={currentUserId}
                    viewerIsAdmin={viewerIsAdmin}
                    editPending={edit.isPending}
                    onEdit={(id, body) => edit.mutateAsync({ id, body })}
                    onDelete={(id) => remove.mutate(id)}
                    actions={
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-term-muted"
                          onClick={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)}
                        >
                          <Reply /> responder
                          {thread.replies.length > 0 && ` (${thread.replies.length})`}
                        </Button>
                        {canResolve && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-term-muted"
                            disabled={resolve.isPending}
                            onClick={() => resolve.mutate({ id: thread.id, resolved: !thread.isResolved })}
                          >
                            <CheckCircle2 /> {thread.isResolved ? "reabrir" : "marcar como resuelta"}
                          </Button>
                        )}
                      </>
                    }
                  />
                  {(thread.replies.length > 0 || replyingTo === thread.id) && (
                    <div className="mt-4 ml-4 space-y-4 border-l-2 border-term-border pl-4 sm:ml-12">
                      {thread.replies.map((reply) => (
                        <div key={reply.id} id={`c-${reply.id}`} className="scroll-mt-24">
                          <Message
                            message={reply}
                            isReply
                            currentUserId={currentUserId}
                            viewerIsAdmin={viewerIsAdmin}
                            editPending={edit.isPending}
                            onEdit={(id, body) => edit.mutateAsync({ id, body })}
                            onDelete={(id) => remove.mutate(id)}
                          />
                        </div>
                      ))}
                      {replyingTo === thread.id && (
                        <Composer
                          placeholder="Escribe tu respuesta…"
                          submitLabel="responder"
                          autoFocus
                          pending={create.isPending && create.variables?.parentId === thread.id}
                          onCancel={() => setReplyingTo(null)}
                          onSubmit={(body) => create.mutateAsync({ body, parentId: thread.id })}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </TermPanel>
      )}
    </div>
  );
}
