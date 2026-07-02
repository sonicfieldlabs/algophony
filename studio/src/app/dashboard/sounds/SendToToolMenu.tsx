"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, FlaskConical, CloudFog, SlidersHorizontal, Aperture,
  Bug, Package, RefreshCw, BookOpen, Eye, FolderKanban,
  SlidersVertical, Gamepad2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ROUTE_DESTINATIONS, routeToTool,
  type RouteDestination,
} from "@/lib/sfx/route-to-tool";

/** Map route-to-tool icon ID → lucide component */
const ICON_MAP: Record<string, LucideIcon> = {
  "flask-conical": FlaskConical,
  "cloud-fog": CloudFog,
  "sliders-horizontal": SlidersHorizontal,
  "aperture": Aperture,
  "bug": Bug,
  "package": Package,
  "refresh-cw": RefreshCw,
  "book-open": BookOpen,
  "eye": Eye,
  "folder-kanban": FolderKanban,
  "sliders-vertical": SlidersVertical,
  "gamepad-2": Gamepad2,
};

interface SendToToolMenuProps {
  generation: Record<string, unknown>;
}

export function SendToToolMenu({ generation }: SendToToolMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleRoute = (dest: RouteDestination) => {
    const path = routeToTool(generation, dest);
    setOpen(false);
    router.push(path);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="atlas-tap rounded-lg p-2 text-atlas-text-muted transition-colors hover:bg-atlas-accent/10 hover:text-atlas-accent"
        title="Send to Tool"
      >
        <Send className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-atlas-border bg-atlas-surface shadow-xl shadow-black/20 py-1 animate-fade-in">
          <div className="px-3 py-1.5 border-b border-atlas-border-subtle">
            <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Send to Tool</span>
          </div>
          {ROUTE_DESTINATIONS.map((route) => {
            const isPaid = route.minTier !== "free";
            const Icon = ICON_MAP[route.icon] ?? Send;
            return (
              <button
                key={route.id}
                onClick={() => handleRoute(route.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-atlas-surface-hover transition-colors group"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-atlas-text-muted group-hover:text-atlas-accent transition-colors" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-atlas-text group-hover:text-atlas-accent transition-colors">{route.label}</span>
                    {isPaid && (
                      <span className="text-[8px] text-atlas-text-dim bg-atlas-surface-hover rounded px-1 py-0.5 uppercase">{route.minTier}</span>
                    )}
                  </div>
                  <p className="text-xs text-atlas-text-dim truncate">{route.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
