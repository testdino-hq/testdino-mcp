export const PAGE_SIZE = 10;

interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize = PAGE_SIZE, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">Page {page + 1} of {totalPages}</span>
      <button
        className="pagination-btn"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <button
        className="pagination-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
