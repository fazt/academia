import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError, errorMessage } from "@/lib/api";

/**
 * Lleva los errores de la API al formulario: los de validación (issues) a sus
 * campos y un 409 (duplicado) al campo indicado. El resto se muestra en un toast.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  conflictField?: FieldPath<T>,
) {
  if (error instanceof ApiError) {
    if (error.status === 409 && conflictField) {
      setError(conflictField, { type: "server", message: error.message }, { shouldFocus: true });
      return;
    }
    if (error.issues.length) {
      for (const issue of error.issues) {
        setError(issue.path as FieldPath<T>, { type: "server", message: issue.message });
      }
      toast.error("Revisa los campos marcados");
      return;
    }
  }
  toast.error(errorMessage(error));
}
