// useSubstringFilter Hook - Custom hook for substring filtering

import { useMemo, useState } from 'react';

export function useSubstringFilter<T>(params: {
  items: T[];
  getSearchText: (item: T) => string;
}) {
  const { items, getSearchText } = params;
  const [filterQuery, setFilterQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [filterQuery, getSearchText, items]);

  const clearFilters = () => setFilterQuery('');

  return {
    filterQuery,
    setFilterQuery,
    hasActiveFilters: filterQuery.trim().length > 0,
    clearFilters,
    filteredItems,
  };
}
