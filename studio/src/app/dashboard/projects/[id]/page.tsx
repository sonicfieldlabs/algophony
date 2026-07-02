"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FolderKanban, Loader2, Save } from "lucide-react";

interface Project {
  id: string; name: string; medium: string | null; description: string | null;
  sonic_brief: Record<string, string | string[]>; default_settings: Record<string, unknown>;
  created_at: string; updated_at: string;
}

/** Extracted outside render to prevent re-mount on every state change */
function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-atlas-text-muted mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          rows={2} className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim" />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [medium, setMedium] = useState("");
  const [description, setDescription] = useState("");
  const [sceneWorldDescription, setSceneWorldDescription] = useState("");
  const [referenceAdjectives, setReferenceAdjectives] = useState("");
  const [sonicPalette, setSonicPalette] = useState("");
  const [avoidedSounds, setAvoidedSounds] = useState("");
  const [preferredRealism, setPreferredRealism] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${id}`).then((r) => r.json()).then((data) => {
      const p = data.project;
      if (p) {
        setProject(p); setName(p.name); setMedium(p.medium || ""); setDescription(p.description || "");
        const brief = p.sonic_brief || {};
        setSceneWorldDescription(brief.scene_world_description || "");
        setReferenceAdjectives(Array.isArray(brief.reference_adjectives) ? brief.reference_adjectives.join(", ") : "");
        setSonicPalette(Array.isArray(brief.sonic_palette) ? brief.sonic_palette.join(", ") : "");
        setAvoidedSounds(Array.isArray(brief.avoided_sounds) ? brief.avoided_sounds.join(", ") : "");
        setPreferredRealism(brief.preferred_realism_level || "");
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, medium: medium || undefined, description: description || undefined,
          sonic_brief: {
            scene_world_description: sceneWorldDescription,
            reference_adjectives: referenceAdjectives.split(",").map((s) => s.trim()).filter(Boolean),
            sonic_palette: sonicPalette.split(",").map((s) => s.trim()).filter(Boolean),
            avoided_sounds: avoidedSounds.split(",").map((s) => s.trim()).filter(Boolean),
            preferred_realism_level: preferredRealism,
          },
        }),
      });
      if (res.ok) { const data = await res.json(); setProject(data.project); }
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-atlas-text-dim" /></div>;
  if (!project) return <div className="p-6 text-sm text-atlas-text-muted">Project not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FolderKanban className="h-6 w-6 text-atlas-accent" />
        <h1 className="text-xl font-semibold text-atlas-text">{project.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-atlas-border bg-atlas-surface p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Project Info</h3>
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Medium" value={medium} onChange={setMedium} placeholder="film, game, podcast..." />
            <Field label="Description" value={description} onChange={setDescription} multiline />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-atlas-accent px-4 py-2 text-xs text-white hover:bg-atlas-accent-hover disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-atlas-border bg-atlas-surface p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Sonic Brief</h3>
            <Field label="Scene/World Description" value={sceneWorldDescription} onChange={setSceneWorldDescription} multiline placeholder="Describe the world or scene..." />
            <Field label="Reference Adjectives" value={referenceAdjectives} onChange={setReferenceAdjectives} placeholder="dark, organic, metallic (comma-separated)" />
            <Field label="Sonic Palette" value={sonicPalette} onChange={setSonicPalette} placeholder="low drones, sharp clicks, wet impacts..." />
            <Field label="Avoided Sounds" value={avoidedSounds} onChange={setAvoidedSounds} placeholder="music, cartoon, synthetic..." />
            <Field label="Preferred Realism Level" value={preferredRealism} onChange={setPreferredRealism} placeholder="hyper-realistic, stylized, abstract..." />
          </div>
        </div>
      </div>
    </div>
  );
}
