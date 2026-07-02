"use client";

import { cn } from "@/lib/utils";
import {
  UI_ELEMENT_TYPES,
  ELEMENT_TYPE_LABELS,
  ELEMENT_ACTIONS,
  ACTION_TYPE_LABELS,
  ELEMENT_SIZES,
  ELEMENT_SHAPES,
  ELEMENT_WEIGHTS,
  ELEMENT_BEHAVIORS,
  type UIElementType,
  type UIActionType,
  type ElementSize,
  type ElementShape,
  type ElementWeight,
  type ElementBehavior,
} from "@/lib/sfx/ui-elements-taxonomy";
import {
  MousePointerClick,
  ToggleLeft,
  SlidersHorizontal,
  Menu,
  Maximize2,
  Columns,
  CreditCard,
  Bell,
  MessageSquare,
  ArrowRightLeft,
  Music,
} from "lucide-react";

const ELEMENT_ICONS: Record<UIElementType, React.ElementType> = {
  button: MousePointerClick,
  toggle: ToggleLeft,
  slider: SlidersHorizontal,
  menu: Menu,
  modal: Maximize2,
  tab: Columns,
  card: CreditCard,
  notification: Bell,
  dialog: MessageSquare,
  transition: ArrowRightLeft,
  sonic_logo: Music,
};

interface ElementBuilderProps {
  elementType: UIElementType;
  actionType: UIActionType;
  size: ElementSize;
  shape: ElementShape;
  weight: ElementWeight;
  behavior: ElementBehavior;
  onElementTypeChange: (t: UIElementType) => void;
  onActionTypeChange: (a: UIActionType) => void;
  onSizeChange: (s: ElementSize) => void;
  onShapeChange: (s: ElementShape) => void;
  onWeightChange: (w: ElementWeight) => void;
  onBehaviorChange: (b: ElementBehavior) => void;
}

function PillRow<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<T, string>;
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all capitalize",
              value === opt
                ? "bg-atlas-accent-muted text-atlas-accent ring-1 ring-atlas-accent/30"
                : "bg-atlas-surface text-atlas-text-dim border border-atlas-border-subtle hover:text-atlas-text-muted hover:border-atlas-border"
            )}
          >
            {labels ? labels[opt] : opt.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ElementBuilder({
  elementType,
  actionType,
  size,
  shape,
  weight,
  behavior,
  onElementTypeChange,
  onActionTypeChange,
  onSizeChange,
  onShapeChange,
  onWeightChange,
  onBehaviorChange,
}: ElementBuilderProps) {
  const availableActions = ELEMENT_ACTIONS[elementType] ?? [];

  const handleElementChange = (t: UIElementType) => {
    onElementTypeChange(t);
    // Auto-select first action if current one isn't valid
    const actions = ELEMENT_ACTIONS[t] ?? [];
    if (!actions.includes(actionType)) {
      onActionTypeChange(actions[0] ?? "click");
    }
  };

  return (
    <div className="space-y-4">
      {/* Element Type — icon grid */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">
          Element Type
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {UI_ELEMENT_TYPES.map((et) => {
            const Icon = ELEMENT_ICONS[et];
            const isActive = et === elementType;
            return (
              <button
                key={et}
                onClick={() => handleElementChange(et)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent shadow-xs"
                    : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-dim hover:border-atlas-border hover:text-atlas-text-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {ELEMENT_TYPE_LABELS[et]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Type — contextual pills */}
      <PillRow
        label="Action"
        options={availableActions}
        value={actionType}
        onChange={onActionTypeChange}
        labels={ACTION_TYPE_LABELS}
      />

      {/* Element Properties */}
      <PillRow label="Size" options={ELEMENT_SIZES} value={size} onChange={onSizeChange} />
      <PillRow label="Shape" options={ELEMENT_SHAPES} value={shape} onChange={onShapeChange} />
      <PillRow label="Weight" options={ELEMENT_WEIGHTS} value={weight} onChange={onWeightChange} />
      <PillRow label="Behavior" options={ELEMENT_BEHAVIORS} value={behavior} onChange={onBehaviorChange} />
    </div>
  );
}
