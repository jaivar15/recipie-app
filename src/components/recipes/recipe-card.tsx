import Link from "next/link";
import Image from "next/image";
import { Clock, Users as UsersIcon, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type RecipeCardData = {
  id: string;
  title: string;
  imageUrl: string | null;
  visibility: "personal" | "household";
  difficulty: string | null;
  cuisine: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number;
  authorName: string | null;
};

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="group h-full overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              unoptimized
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <Badge
            variant={recipe.visibility === "household" ? "default" : "secondary"}
            className="absolute top-2 left-2"
          >
            {recipe.visibility === "household" ? "Household" : "Personal"}
          </Badge>
        </div>
        <div className="space-y-2 p-4 pt-3">
          <h3 className="line-clamp-2 font-medium leading-tight">{recipe.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {totalTime > 0 ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {totalTime} min
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3 w-3" /> {recipe.servings}
            </span>
            {recipe.cuisine ? <span>{recipe.cuisine}</span> : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
