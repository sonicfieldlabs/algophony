import { Waves, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-atlas-bg px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-atlas-accent-muted">
          <Waves className="h-8 w-8 text-atlas-accent" />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-atlas-text tabular-nums">404</h1>
        <h2 className="mb-2 text-lg font-semibold text-atlas-text">Page not found</h2>
        <p className="mb-8 text-sm text-atlas-text-muted leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-atlas-accent px-6 py-3 text-sm font-medium text-white transition-all hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
