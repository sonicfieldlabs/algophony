"use client";

import { useState } from "react";
import { Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type NamingTemplate,
  NAMING_VARIABLES, NAMING_PRESETS,
} from "@/lib/sfx/export-taxonomy";
import { generateFileName } from "@/lib/sfx/export-builders";

interface NamingConventionBuilderProps {
  template: NamingTemplate;
  onChange: (t: NamingTemplate) => void;
}

const SAMPLE_DATA: Record<string, string> = {
  project_code: "PRJ",
  scene: "SC03",
  category: "Footstep",
  subcategory: "Leather",
  sound_name: "WetConcrete",
  surface: "Concrete",
  material: "Leather",
  perspective: "Close",
  layer_role: "Foreground",
  variation: "L",
  take: "01",
  version: "03",
  loop: "false",
  date: "2026-05-17",
};

const PRESET_KEYS = Object.keys(NAMING_PRESETS);

export function NamingConventionBuilder({ template, onChange }: NamingConventionBuilderProps) {
  const [customTemplate, setCustomTemplate] = useState(template.template);

  const previewName = generateFileName(
    { ...template, template: customTemplate },
    SAMPLE_DATA,
    "mp3"
  );

  const handlePresetSelect = (key: string) => {
    const preset = NAMING_PRESETS[key];
    if (preset) {
      onChange(preset);
      setCustomTemplate(preset.template);
    }
  };

  const handleInsertVar = (varName: string) => {
    const newTemplate = customTemplate + `{${varName}}`;
    setCustomTemplate(newTemplate);
    onChange({ ...template, template: newTemplate });
  };

  const handleTemplateChange = (value: string) => {
    setCustomTemplate(value);
    onChange({ ...template, template: value });
  };

  return (
    <div className="atlas-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Puzzle className="h-4 w-4 text-atlas-accent" />
        <h3 className="text-sm font-semibold text-atlas-text">Naming Convention</h3>
      </div>

      {/* Presets */}
      <div className="mb-3">
        <label className="text-xs text-atlas-text-dim mb-1.5 block">Presets</label>
        <div className="flex gap-1.5">
          {PRESET_KEYS.map((key) => (
            <button key={key} onClick={() => handlePresetSelect(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all capitalize",
                template.template === NAMING_PRESETS[key].template
                  ? "bg-atlas-accent-muted text-atlas-accent"
                  : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
              )}
            >
              {key.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Template editor */}
      <div className="mb-3">
        <label className="text-xs text-atlas-text-dim mb-1 block">Template</label>
        <input value={customTemplate} onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text font-mono focus:border-atlas-accent focus:outline-none"
          placeholder="{project_code}_{category}_{sound_name}_v{version}" />
      </div>

      {/* Variable tokens */}
      <div className="mb-3">
        <label className="text-xs text-atlas-text-dim mb-1.5 block">Insert Variable</label>
        <div className="flex flex-wrap gap-1">
          {NAMING_VARIABLES.map((v) => (
            <button key={v} onClick={() => handleInsertVar(v)}
              className="rounded-md bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-muted hover:text-atlas-accent hover:bg-atlas-accent-muted transition-all font-mono"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Case + separator */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-atlas-text-dim mb-1 block">Case Style</label>
          <select value={template.caseStyle} onChange={(e) => onChange({ ...template, caseStyle: e.target.value as NamingTemplate["caseStyle"] })}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
          >
            <option value="pascal">PascalCase</option>
            <option value="upper">UPPERCASE</option>
            <option value="lower">lowercase</option>
            <option value="camel">camelCase</option>
            <option value="original">Original</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-atlas-text-dim mb-1 block">Separator</label>
          <select value={template.separator} onChange={(e) => onChange({ ...template, separator: e.target.value })}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
          >
            <option value="_">Underscore (_)</option>
            <option value="-">Hyphen (-)</option>
            <option value=".">Dot (.)</option>
          </select>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3">
        <label className="text-xs text-atlas-text-dim mb-1 block">Preview</label>
        <code className="text-sm text-atlas-accent font-mono">{previewName}</code>
      </div>
    </div>
  );
}
