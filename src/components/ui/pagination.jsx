import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const DOTS = "dots";

function rangeOfNumbers(start, end) {
  const length = end - start + 1;
  return Array.from({ length }, (_, index) => start + index);
}

function buildPageItems(currentPage, totalPages, siblingCount = 1) {
  const totalPageNumbers = siblingCount * 2 + 5;

  if (totalPageNumbers >= totalPages) {
    return rangeOfNumbers(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + siblingCount * 2;
    const leftRange = rangeOfNumbers(1, leftItemCount);
    return [...leftRange, DOTS, lastPageIndex];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + siblingCount * 2;
    const rightRange = rangeOfNumbers(totalPages - rightItemCount + 1, totalPages);
    return [firstPageIndex, DOTS, ...rightRange];
  }

  const middleRange = rangeOfNumbers(leftSiblingIndex, rightSiblingIndex);
  return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
}

export default function ModernPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className
}) {
  if (totalItems === 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = buildPageItems(safeCurrentPage, totalPages);

  const startEntry = (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalItems);

  const baseButtonClasses =
    "inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-white/10 disabled:hover:bg-white/10";

  const iconButtonClasses = cn(baseButtonClasses, "h-9 w-9 px-0");

  function handlePageChange(nextPage) {
    if (nextPage === safeCurrentPage) return;
    if (onPageChange) {
      onPageChange(nextPage);
    }
  }

  return (
    <nav
      className={cn(
        "mt-4 flex flex-col gap-4 border-t border-white/10 bg-white/5 px-4 py-4 text-sm text-muted-foreground backdrop-blur sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
      aria-label="Pagination"
    >
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Showing entries
        </span>
        <span className="text-base font-medium text-foreground">{`${startEntry} - ${endEntry}`}</span>
        <span className="text-xs text-muted-foreground/70">{`of ${totalItems} records`}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={iconButtonClasses}
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageItems.map((item, index) =>
          item === DOTS ? (
            <span
              key={`dots-${index}`}
              className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground/70"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={cn(
                baseButtonClasses,
                item === safeCurrentPage &&
                  "border-primary/60 bg-primary/15 text-primary shadow-lg shadow-primary/20"
              )}
              onClick={() => handlePageChange(item)}
              aria-current={item === safeCurrentPage ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className={iconButtonClasses}
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
