import React from 'react';
import { Search } from 'lucide-react';

/**
 * Consistent search field with icon + padding so text never overlaps the icon.
 */
const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 z-10"
        size={18}
        strokeWidth={2.25}
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-12 pl-12 pr-4 rounded-xl bg-sand border border-brand-100 text-ink text-sm font-medium placeholder:text-stone-400 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 ${inputClassName}`}
      />
    </div>
  );
};

export default SearchInput;
