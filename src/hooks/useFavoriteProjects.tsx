import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pms_favorite_projects';

export function useFavoriteProjects() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {}
  }, [favorites]);

  const toggleFavorite = useCallback((projectId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((projectId: string) => {
    return favorites.has(projectId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
