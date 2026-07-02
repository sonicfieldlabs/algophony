"use client";

import { useState, useCallback, useMemo } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useToast } from "@/app/dashboard/toast";
import {
  ImageToSoundSession,
  ImageAnalysis,
  SoundCard,
  SoundCardDraft,
  VisualElement,
  InterpretationMode,
  UseCase,
  SonicStrategy,
  defaultSession,
  draftToSoundCard,
  buildLayerPlan,
  estimateImageToSoundCost,
  elementToSonicMapping
} from "@/lib/sfx/image-to-sound-taxonomy";
import { ImageUploadPanel } from "./ImageUploadPanel";
import { ImageConfigPanel } from "./ImageConfigPanel";
import { VisualSonicAnalysisPanel } from "./VisualSonicAnalysisPanel";
import { VisualSonicMap } from "./VisualSonicMap";
import { SonicStrategySelector } from "./SonicStrategySelector";
import { SoundCardsGrid } from "./SoundCardsGrid";
import { ImageLayerPlanView } from "./ImageLayerPlanView";
import { ImageSoundGeneratePanel } from "./ImageSoundGeneratePanel";
import { SendToToolPanel } from "./SendToToolPanel";

export default function ImageToSoundPage() {
  const toast = useToast();

  // App state
  const [session, setSession] = useState<ImageToSoundSession>(() => defaultSession());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Handle image upload & analysis
  const handleImageSelect = useCallback(async (base64: string, file: File) => {
    setSession(prev => ({ ...prev, imageDataUrl: base64, status: "analyzing" }));
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/image-to-sound/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          interpretationMode: session.interpretationMode,
          useCase: session.useCase,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze image");
      }

      const analysisData = (await res.json()) as ImageAnalysis;

      // Convert drafts to proper sound cards
      const generatedCards = analysisData.soundCards.map((draft: SoundCardDraft, i: number) =>
        draftToSoundCard(draft, i)
      );

      setSession(prev => ({
        ...prev,
        analysis: analysisData,
        sonicStrategy: analysisData.suggestedStrategy || prev.sonicStrategy,
        soundCards: generatedCards,
        status: "analyzed"
      }));

      toast.success("Image analyzed successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error analyzing image");
      setSession(prev => ({ ...prev, status: "failed" }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [session.interpretationMode, session.useCase, toast]);

  const handleClearImage = useCallback(() => {
    setSession(defaultSession());
  }, []);

  // 2. Handle configuration changes
  const handleUseCaseChange = useCallback((useCase: UseCase) => {
    setSession(prev => ({ ...prev, useCase }));
  }, []);

  const handleModeChange = useCallback((interpretationMode: InterpretationMode) => {
    setSession(prev => ({ ...prev, interpretationMode }));
  }, []);

  const handleStrategyChange = useCallback((sonicStrategy: SonicStrategy) => {
    setSession(prev => ({ ...prev, sonicStrategy }));
  }, []);

  // 3. Handle card updates
  const handleUpdateCard = useCallback((id: string, updates: Partial<SoundCard>) => {
    setSession(prev => ({
      ...prev,
      soundCards: prev.soundCards.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  }, []);

  const handleRemoveCard = useCallback((id: string) => {
    setSession(prev => ({
      ...prev,
      soundCards: prev.soundCards.filter(c => c.id !== id)
    }));
  }, []);

  const handleDuplicateCard = useCallback((id: string) => {
    setSession(prev => {
      const cardToClone = prev.soundCards.find(c => c.id === id);
      if (!cardToClone) return prev;

      const newCard: SoundCard = {
        ...cardToClone,
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${cardToClone.title} (Copy)`,
        status: "draft",
        audioUrl: undefined,
        generationId: undefined,
        selected: true
      };

      const insertIndex = prev.soundCards.findIndex(c => c.id === id) + 1;
      const newCards = [...prev.soundCards];
      newCards.splice(insertIndex, 0, newCard);

      return { ...prev, soundCards: newCards };
    });
  }, []);

  const handleCreateCardFromElement = useCallback((element: VisualElement) => {
    const mapping = elementToSonicMapping(element);

    const newCard: SoundCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${element.element} sounds`,
      category: mapping.category.split('/')[0].trim() || "Foley",
      layerRole: mapping.suggestedLayerRole,
      visualSource: element.element,
      prompt: `High quality sound effect of ${element.element}, focusing on ${mapping.possibleSounds.join(" and ")}, realistic, highly detailed, no music.`,
      durationSeconds: 4,
      loop: false,
      promptInfluence: 0.3,
      exclusions: ["no music", "no dialogue"],
      selected: true,
      status: "draft",
      sortOrder: session.soundCards.length
    };

    setSession(prev => ({
      ...prev,
      soundCards: [...prev.soundCards, newCard]
    }));

    toast.success(`Created prompt card for ${element.element}`);
  }, [session.soundCards.length, toast]);

  // 4. Handle generation
  const handleGenerate = useCallback(async () => {
    const cardsToGenerate = session.soundCards.filter(c => c.selected && c.status !== "generated");
    if (cardsToGenerate.length === 0) return;

    setIsGenerating(true);
    setSession(prev => ({
      ...prev,
      status: "generating",
      soundCards: prev.soundCards.map(c =>
        (c.selected && c.status !== "generated") ? { ...c, status: "generating" } : c
      )
    }));

    let successCount = 0;

    // Process sequentially to not slam the API and respect rate limits smoothly
    for (const card of cardsToGenerate) {
      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: card.prompt,
            duration_seconds: card.durationSeconds,
            loop: card.loop,
            prompt_influence: card.promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();

        if (res.ok && data.audioUrl) {
          handleUpdateCard(card.id, {
            status: "generated",
            audioUrl: data.audioUrl,
            generationId: data.generationId
          });
          successCount++;
        } else {
          handleUpdateCard(card.id, {
            status: "failed",
            errorMessage: data.error || "Generation failed"
          });
        }
      } catch {
        handleUpdateCard(card.id, {
          status: "failed",
          errorMessage: "Network error"
        });
      }
    }

    setIsGenerating(false);
    setSession(prev => ({ ...prev, status: "completed" }));

    if (successCount > 0) {
      toast.success(`${successCount} sound${successCount > 1 ? 's' : ''} generated successfully`);
    } else {
      toast.error("Generation failed for all selected cards");
    }
  }, [session.soundCards, handleUpdateCard, toast]);

  // Derived state
  const layerPlan = useMemo(() => buildLayerPlan(session.soundCards), [session.soundCards]);
  const estimatedCost = useMemo(() =>
    estimateImageToSoundCost(session.soundCards.filter(c => c.selected && c.status !== "generated").length),
  [session.soundCards]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6 pb-20">
      {/* Two-column layout — top row has the small image preview side-by-side
          with the (now wider) Target Context module, so the user can scan
          both at a glance. Analysis flows below across the full width. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <ImageUploadPanel
            onImageSelect={handleImageSelect}
            selectedImage={session.imageDataUrl}
            onClear={handleClearImage}
            disabled={isAnalyzing || isGenerating}
          />
        </div>
        <div className="lg:col-span-2">
          <ImageConfigPanel
            useCase={session.useCase}
            interpretationMode={session.interpretationMode}
            onUseCaseChange={handleUseCaseChange}
            onModeChange={handleModeChange}
            disabled={isAnalyzing || isGenerating || !!session.analysis}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="hidden lg:block lg:col-span-1" />

        {/* Analysis & Cards — span 2 so it lines up under the wider
            target-context column. */}
        <div className="lg:col-span-2 space-y-5">
          {isAnalyzing || session.analysis ? (
            <>
              <VisualSonicAnalysisPanel
                analysis={session.analysis}
                isAnalyzing={isAnalyzing}
              />

              {!isAnalyzing && session.analysis && (
                <>
                  <VisualSonicMap
                    elements={session.analysis.visualElements}
                    onCreateCard={handleCreateCardFromElement}
                  />

                  <SonicStrategySelector
                    strategy={session.sonicStrategy}
                    onStrategyChange={handleStrategyChange}
                    suggestedStrategy={session.analysis.suggestedStrategy}
                  />

                  <ImageLayerPlanView plan={layerPlan} />

                  <SoundCardsGrid
                    cards={session.soundCards}
                    onUpdateCard={handleUpdateCard}
                    onRemoveCard={handleRemoveCard}
                    onDuplicateCard={handleDuplicateCard}
                  />

                  <ImageSoundGeneratePanel
                    cards={session.soundCards}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    estimatedCost={estimatedCost}
                  />

                  <SendToToolPanel
                    cards={session.soundCards}
                    disabled={isGenerating}
                  />
                </>
              )}
            </>
          ) : (
            <div className="atlas-card h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-atlas-text-dim opacity-60">
              <ImageIcon className="h-12 w-12 mb-4 text-atlas-border-subtle" />
              <h3 className="text-sm font-semibold text-atlas-text mb-2">Waiting for Image</h3>
              <p className="text-xs max-w-sm mx-auto">
                Upload a concept art frame, storyboard, game screenshot, or UI mockup to begin the analysis process.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
