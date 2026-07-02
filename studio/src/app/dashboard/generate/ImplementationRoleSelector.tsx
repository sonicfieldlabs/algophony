"use client";

import { useState, useMemo } from "react";
import {
  Cpu, ChevronDown, ChevronRight, Info, Check, Copy,
  Zap, Settings, Shuffle, Wind, MessageCircle, AlertTriangle,
  Theater, MousePointerClick, Clapperboard, Repeat, ArrowLeftRight,
  Film, Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IMPLEMENTATION_ROLES,
  adaptPromptForRole,
  type ImplementationRole, type AdaptedPrompt,
} from "@/lib/sfx/implementation-prompting";

interface ImplementationRoleSelectorProps {
  prompt: string;
  exclusions: string[];
  onApply: (adapted: AdaptedPrompt) => void;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  high_frequency_trigger: Zap,
  random_container: Shuffle,
  ambient_layer: Wind,
  speech_safe: MessageCircle,
  urgent_not_alarming: AlertTriangle,
  behind_dialogue: Theater,
  ui_feedback: MousePointerClick,
  cinematic_oneshot: Clapperboard,
  loop_bed: Repeat,
  transition_element: ArrowLeftRight,
  foley_sync: Film,
  music_adjacent: Music,
  custom: Settings,
};

export function ImplementationRoleSelector({ prompt, exclusions, onApply }: ImplementationRoleSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ImplementationRole | null>(null);
  const [showConstraints, setShowConstraints] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const adapted = useMemo(() => {
    if (!selectedRole || !prompt) return null;
    return adaptPromptForRole(prompt, selectedRole, exclusions);
  }, [selectedRole, prompt, exclusions]);

  const roleDef = selectedRole ? IMPLEMENTATION_ROLES.find((r) => r.id === selectedRole) : null;

  const handleCopy = async () => {
    if (!adapted) return;
    await navigator.clipboard.writeText(adapted.adaptedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="atlas-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 border-b border-atlas-border-subtle flex items-center gap-2 hover:bg-atlas-surface-hover/50 transition-colors"
      >
        <Cpu className="h-4 w-4 text-atlas-accent" />
        <h3 className="text-sm font-semibold text-atlas-text">Implementation Role</h3>
        <span className="text-xs text-atlas-text-dim ml-auto mr-2">How will this sound be used?</span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Role grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {IMPLEMENTATION_ROLES.filter((r) => r.id !== "custom").map((role) => {
              const RoleIcon = ROLE_ICONS[role.id] ?? Settings;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl p-2.5 text-left transition-all border",
                    isSelected
                      ? "border-atlas-accent bg-atlas-accent/5"
                      : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
                  )}
                >
                  <RoleIcon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", isSelected ? "text-atlas-accent" : "text-atlas-text-dim")} />
                  <div className="min-w-0">
                    <span className={cn(
                      "text-xs font-semibold block",
                      isSelected ? "text-atlas-accent" : "text-atlas-text"
                    )}>
                      {role.label}
                    </span>
                    <span className="text-xs text-atlas-text-dim leading-tight block line-clamp-1">{role.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Constraints & adapted prompt */}
          {selectedRole && roleDef && adapted && (
            <div className="space-y-3 pt-1">
              {/* Constraints breakdown */}
              <button
                onClick={() => setShowConstraints(!showConstraints)}
                className="flex items-center gap-2 text-xs text-atlas-text-muted hover:text-atlas-text"
              >
                <Info className="h-3 w-3" />
                {roleDef.constraints.length} constraints applied
                {showConstraints ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {showConstraints && (
                <div className="rounded-xl border border-atlas-border-subtle p-3 space-y-1.5">
                  {roleDef.constraints.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={cn(
                        "rounded px-1 py-0.5 text-xs font-medium uppercase shrink-0",
                        c.type === "modifier" ? "bg-green-400/10 text-green-400" :
                        c.type === "exclusion" ? "bg-red-400/10 text-red-400" :
                        "bg-blue-400/10 text-blue-400"
                      )}>
                        {c.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-atlas-text font-medium">{c.value}</span>
                        <p className="text-xs text-atlas-text-dim">{c.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Adapted prompt preview */}
              <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Adapted Prompt</span>
                  <button onClick={handleCopy} className="text-xs text-green-400 hover:underline flex items-center gap-1">
                    {copiedPrompt ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                    {copiedPrompt ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-atlas-text font-mono leading-relaxed">{adapted.adaptedPrompt}</p>
              </div>

              {/* Added modifiers */}
              {adapted.addedModifiers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-atlas-text-dim mr-1">Added:</span>
                  {adapted.addedModifiers.map((m) => (
                    <span key={m} className="rounded bg-green-400/10 px-1.5 py-0.5 text-xs text-green-400">{m}</span>
                  ))}
                </div>
              )}

              {/* New exclusions */}
              {adapted.addedExclusions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-atlas-text-dim mr-1">Exclusions:</span>
                  {adapted.addedExclusions.map((e) => (
                    <span key={e} className="rounded bg-red-400/10 px-1.5 py-0.5 text-xs text-red-400">{e}</span>
                  ))}
                </div>
              )}

              {/* Suggested settings */}
              {Object.keys(adapted.suggestedSettings).length > 0 && (
                <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 flex flex-wrap gap-3">
                  <span className="text-xs text-atlas-text-dim flex items-center gap-1"><Settings className="h-3 w-3" /> Settings:</span>
                  {adapted.suggestedSettings.maxDuration != null && (
                    <span className="text-xs text-atlas-text-muted">Max: {adapted.suggestedSettings.maxDuration}s</span>
                  )}
                  {adapted.suggestedSettings.minDuration != null && (
                    <span className="text-xs text-atlas-text-muted">Min: {adapted.suggestedSettings.minDuration}s</span>
                  )}
                  {adapted.suggestedSettings.loop != null && (
                    <span className="text-xs text-atlas-text-muted">Loop: {adapted.suggestedSettings.loop ? "Yes" : "No"}</span>
                  )}
                  {adapted.suggestedSettings.promptInfluence != null && (
                    <span className="text-xs text-atlas-text-muted">PI: {adapted.suggestedSettings.promptInfluence}</span>
                  )}
                  {adapted.suggestedSettings.variationCount != null && (
                    <span className="text-xs text-atlas-text-muted">Variations: {adapted.suggestedSettings.variationCount}</span>
                  )}
                  {adapted.suggestedSettings.noRepeat && (
                    <span className="text-xs text-atlas-accent">No-repeat</span>
                  )}
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={() => onApply(adapted)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all"
              >
                <Zap className="h-4 w-4" /> Apply to Prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
