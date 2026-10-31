import { AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";

/** Server-rendered fallback when a catalog page cannot reach the database. */
export function LoadError({ title, error }: { title: string; error: unknown }) {
  console.error(`[admin:${title}]`, error);
  return (
    <>
      <AdminPageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-bad/30 bg-bad/5 px-6 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-bad" aria-hidden="true" />
        <p className="font-medium text-ink">No pudimos cargar los datos.</p>
        <p className="max-w-sm text-sm text-dim">Revisá la conexión con la base de datos y recargá la página.</p>
        <a href="" className="mt-1 text-sm text-ink underline underline-offset-4">
          Recargar
        </a>
      </div>
    </>
  );
}
