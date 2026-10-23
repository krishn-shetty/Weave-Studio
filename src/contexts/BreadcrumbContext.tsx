import React, { createContext, useContext, useEffect, useState } from 'react';

interface BreadcrumbContextValue {
  customTitles: Record<string, string>;
  setCustomTitle: (pathOrKey: string, title: string) => void;
  clearCustomTitle: (pathOrKey: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});

  const setCustomTitle = (pathOrKey: string, title: string) => {
    setCustomTitles((prev) => {
      if (prev[pathOrKey] === title) return prev;
      return { ...prev, [pathOrKey]: title };
    });
  };

  const clearCustomTitle = (pathOrKey: string) => {
    setCustomTitles((prev) => {
      if (!prev[pathOrKey]) return prev;
      const next = { ...prev };
      delete next[pathOrKey];
      return next;
    });
  };

  return (
    <BreadcrumbContext.Provider value={{ customTitles, setCustomTitle, clearCustomTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}

/**
 * Hook for pages to easily set a custom breadcrumb title for the current page
 */
export function useSetBreadcrumbTitle(title: string | undefined | null, key?: string) {
  const ctx = useBreadcrumbContext();

  useEffect(() => {
    if (!ctx || !title) return;
    const targetKey = key || window.location.pathname;
    ctx.setCustomTitle(targetKey, title);

    return () => {
      ctx.clearCustomTitle(targetKey);
    };
  }, [ctx, title, key]);
}
