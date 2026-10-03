import { useEffect } from 'react';

export function useGridNavigation(
  containerRef: React.RefObject<HTMLElement>,
  onAddLine: () => void,
  onSave: () => void
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT';
      const isSelect = target.tagName === 'SELECT';
      
      const inputType = isInput ? (target as HTMLInputElement).type : '';
      const isTextInput = isInput && (inputType === 'text' || inputType === 'search');
      
      // SPACEBAR to add a new line
      if (e.code === 'Space') {
        if (isTextInput || isSelect) {
          return; // Allow native space for typing and opening selects
        }
        e.preventDefault();
        onAddLine();
        return;
      }

      const navigableSelectors = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled])';
      const elements = Array.from(container.querySelectorAll(navigableSelectors)) as HTMLElement[];
      
      const currentIndex = elements.indexOf(target);
      if (currentIndex === -1) return;

      // Handle ENTER
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex < elements.length - 1) {
          elements[currentIndex + 1].focus();
        } else {
          onSave();
        }
        return;
      }

      const row = target.closest('tr');
      if (!row) return;
      const tbody = row.closest('tbody');
      if (!tbody) return;
      
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const rowIndex = rows.indexOf(row);
      
      const rowElements = Array.from(row.querySelectorAll(navigableSelectors)) as HTMLElement[];
      const colIndex = rowElements.indexOf(target);
      
      if (e.key === 'ArrowRight') {
        if (isTextInput) {
            const input = target as HTMLInputElement;
            if (input.selectionStart !== null && input.selectionStart < input.value.length) return;
        }
        // Removed the "if (isSelect) return" - so ArrowRight will move focus!
        e.preventDefault();
        if (colIndex < rowElements.length - 1) {
          rowElements[colIndex + 1].focus();
        } else if (rowIndex < rows.length - 1) {
          const nextRowElements = Array.from(rows[rowIndex + 1].querySelectorAll(navigableSelectors)) as HTMLElement[];
          if (nextRowElements.length > 0) nextRowElements[0].focus();
        }
      } else if (e.key === 'ArrowLeft') {
        if (isTextInput) {
            const input = target as HTMLInputElement;
            if (input.selectionEnd !== null && input.selectionEnd > 0) return;
        }
        // Removed the "if (isSelect) return"
        e.preventDefault();
        if (colIndex > 0) {
          rowElements[colIndex - 1].focus();
        } else if (rowIndex > 0) {
          const prevRowElements = Array.from(rows[rowIndex - 1].querySelectorAll(navigableSelectors)) as HTMLElement[];
          if (prevRowElements.length > 0) prevRowElements[prevRowElements.length - 1].focus();
        }
      } else if (e.key === 'ArrowUp') {

        e.preventDefault();
        if (rowIndex > 0) {
          const prevRowElements = Array.from(rows[rowIndex - 1].querySelectorAll(navigableSelectors)) as HTMLElement[];
          const targetElem = prevRowElements[Math.min(colIndex, prevRowElements.length - 1)];
          if (targetElem) targetElem.focus();
        }
      } else if (e.key === 'ArrowDown') {

        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          const nextRowElements = Array.from(rows[rowIndex + 1].querySelectorAll(navigableSelectors)) as HTMLElement[];
          const targetElem = nextRowElements[Math.min(colIndex, nextRowElements.length - 1)];
          if (targetElem) targetElem.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown, false);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [containerRef, onAddLine, onSave]);
}
