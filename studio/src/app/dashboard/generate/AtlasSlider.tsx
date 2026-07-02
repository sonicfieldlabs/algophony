"use client";

import { memo, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AtlasSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  /** Displayed value — override for custom formatting */
  displayValue?: string;
  /** Semantic labels for the low and high ends */
  lowLabel?: string;
  highLabel?: string;
  /** Tick marks to show on the track */
  ticks?: number[];
  className?: string;
}

function AtlasSliderInner({
  value,
  onChange,
  min,
  max,
  step,
  label,
  displayValue,
  lowLabel,
  highLabel,
  ticks,
  className,
}: AtlasSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;
  const showTooltip = dragging || hovering;

  const resolveValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      const stepped = Math.round((clamped * (max - min)) / step) * step + min;
      onChange(parseFloat(stepped.toFixed(4)));
    },
    [min, max, step, onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      resolveValue(e.clientX);
    },
    [resolveValue]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      resolveValue(e.clientX);
    },
    [dragging, resolveValue]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(Math.min(max, parseFloat((value + step).toFixed(4))));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(min, parseFloat((value - step).toFixed(4))));
      }
    },
    [value, min, max, step, onChange]
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-atlas-text-muted">{label}</label>
        <span className="text-xs font-mono text-atlas-accent tabular-nums">
          {displayValue ?? value}
        </span>
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="relative h-8 cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onKeyDown={handleKeyDown}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-atlas-surface-hover ring-1 ring-atlas-border-subtle/50" />

        {/* Track fill — gradient */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full transition-[width] duration-75"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--color-atlas-accent) 0%, var(--color-atlas-accent-hover) 100%)",
          }}
        />

        {/* Tick marks */}
        {ticks?.map((tick) => {
          const tickPct = ((tick - min) / (max - min)) * 100;
          return (
            <div
              key={tick}
              className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-atlas-border"
              style={{ left: `${tickPct}%` }}
            />
          );
        })}

        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "h-4 w-4 rounded-full",
            "bg-atlas-accent border-2 border-atlas-bg",
            "transition-shadow duration-200",
            (dragging || hovering) && "shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          )}
          style={{ left: `${pct}%` }}
        >
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-scale-in">
              <div className="rounded-md bg-atlas-accent px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap shadow-lg">
                {displayValue ?? value}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-atlas-accent" />
            </div>
          )}
        </div>
      </div>

      {/* Semantic labels */}
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-atlas-text-dim">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

export const AtlasSlider = memo(AtlasSliderInner);
