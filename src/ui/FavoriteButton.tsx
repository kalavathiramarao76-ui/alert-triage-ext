import React, { useState, useEffect, useCallback } from "react";
import type { FavoriteItem } from "../shared/favorites";
import { isFavorited, toggleFavorite } from "../shared/favorites";

interface FavoriteButtonProps {
  item: FavoriteItem;
  size?: "sm" | "md";
  onToggle?: (isFav: boolean) => void;
}

export function FavoriteButton({ item, size = "sm", onToggle }: FavoriteButtonProps) {
  const [fav, setFav] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    isFavorited(item.id).then(setFav);
  }, [item.id]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setAnimating(true);
      const newState = await toggleFavorite(item);
      setFav(newState);
      onToggle?.(newState);
      setTimeout(() => setAnimating(false), 600);
    },
    [item, onToggle]
  );

  const dim = size === "sm" ? 16 : 20;

  return (
    <button
      onClick={handleClick}
      className={`favorite-btn ${animating ? "favorite-bounce" : ""}`}
      title={fav ? "Remove from favorites" : "Add to favorites"}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill={fav ? "#f59e0b" : "none"}
        stroke={fav ? "#f59e0b" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-all duration-200 ${fav ? "favorite-star-active" : "favorite-star-inactive"}`}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
