"use client";

import { RouteError } from "../components/route-error";

export default function RecipesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError module="Recipes" {...props} />;
}
