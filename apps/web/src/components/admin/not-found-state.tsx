import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ApiError, errorMessage } from "@/lib/api";

/** Estado para recursos inexistentes o que no se pudieron cargar. */
export function NotFoundState({
  error,
  title,
  backHref,
  backLabel,
}: {
  error: unknown;
  title: string;
  backHref: string;
  backLabel: string;
}) {
  const notFound = !error || (error instanceof ApiError && error.status === 404);
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{notFound ? title : "No se pudo cargar"}</EmptyTitle>
        <EmptyDescription>{notFound ? "Puede que se haya borrado." : errorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
