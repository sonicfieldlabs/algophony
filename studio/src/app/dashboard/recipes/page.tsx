"use client";

import { useState, useCallback, useMemo } from "react";
import { BookOpen, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { SoundDesignRecipe, RecipeCategory } from "@/lib/recipes/recipe-schema";
import { RECIPE_CATEGORY_LABELS, RECIPE_CATEGORY_HUES } from "@/lib/recipes/recipe-schema";
import { loadAllRecipes, getRecipeFavorites, toggleRecipeFavorite, instantiateRecipe } from "@/lib/recipes/recipe-engine";
import { STACKER_IMPORT_KEY } from "@/lib/sfx/stacker-taxonomy";
import { RecipeCard } from "./RecipeCard";
import { RecipeDetail } from "./RecipeDetail";

export default function RecipesPage() {
  const router = useRouter();
  const [recipes] = useState<SoundDesignRecipe[]>(() => loadAllRecipes());
  const [favorites, setFavorites] = useState<Set<string>>(() => getRecipeFavorites());
  const [selectedRecipe, setSelectedRecipe] = useState<SoundDesignRecipe | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | "all">("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const handleToggleFavorite = useCallback((id: string) => {
    const isFav = toggleRecipeFavorite(id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleUseRecipe = useCallback((recipe: SoundDesignRecipe, variables: Record<string, string>) => {
    const cue = instantiateRecipe(recipe, variables);
    // Store in sessionStorage for Stacker to pick up
    if (typeof window !== "undefined") {
      localStorage.setItem(STACKER_IMPORT_KEY, JSON.stringify({
        module: "recipes",
        recipeName: recipe.name,
        recipeId: recipe.id,
        cue,
      }));
    }
    router.push("/dashboard/stacker");
  }, [router]);

  // Get unique categories from recipes
  const categories = useMemo(() => {
    const cats = new Set(recipes.map((r) => r.category));
    return Array.from(cats).sort();
  }, [recipes]);

  // Filter recipes
  const filtered = useMemo(() => {
    let result = recipes;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    if (showFavoritesOnly) {
      result = result.filter((r) => favorites.has(r.id));
    }

    return result;
  }, [recipes, search, categoryFilter, showFavoritesOnly, favorites]);

  const builtInCount = filtered.filter((r) => r.isBuiltIn).length;
  const customCount = filtered.filter((r) => !r.isBuiltIn).length;

  // Detail view
  if (selectedRecipe) {
    return (
      <div className="min-h-screen bg-atlas-bg p-6 lg:p-8 max-w-4xl mx-auto">
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={() => setSelectedRecipe(null)}
          onUseRecipe={handleUseRecipe}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-atlas-bg p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-atlas-text flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-atlas-accent" />
          Sound Design Recipes
        </h1>
        <p className="text-sm text-atlas-text-muted mt-1">
          Reusable multi-layer sound structures. Select a recipe and send it to the Stacker.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full rounded-lg border border-atlas-border bg-atlas-surface pl-9 pr-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/50 focus:border-atlas-accent focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-atlas-text-dim" />
          <button
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              categoryFilter === "all" ? "bg-atlas-accent text-white" : "bg-atlas-surface-hover text-atlas-text-muted"
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const hue = RECIPE_CATEGORY_HUES[cat] ?? 200;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  categoryFilter === cat
                    ? "text-white"
                    : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
                )}
                style={categoryFilter === cat ? { background: `hsl(${hue}, 50%, 40%)` } : undefined}
              >
                {RECIPE_CATEGORY_LABELS[cat] ?? cat}
              </button>
            );
          })}
        </div>

        {/* Favorites toggle */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
            showFavoritesOnly ? "bg-red-400/20 text-red-400" : "bg-atlas-surface-hover text-atlas-text-muted"
          )}
        >
          ♥ Favorites
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-atlas-text-dim mb-4">
        <span>{filtered.length} recipe{filtered.length !== 1 ? "s" : ""}</span>
        {builtInCount > 0 && <span>{builtInCount} built-in</span>}
        {customCount > 0 && <span>{customCount} custom</span>}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-atlas-text-dim">
          <BookOpen className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No recipes found</p>
          <p className="text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favorites.has(recipe.id)}
              onToggleFavorite={handleToggleFavorite}
              onSelect={setSelectedRecipe}
            />
          ))}
        </div>
      )}
    </div>
  );
}
