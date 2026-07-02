import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atlas-accent-muted">
          <Compass className="h-7 w-7 text-atlas-accent" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-atlas-text">Module not found</h2>
        <p className="mb-6 text-sm text-atlas-text-muted">
          This workspace module doesn&apos;t exist. Use the sidebar to navigate to an available module.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-atlas-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
