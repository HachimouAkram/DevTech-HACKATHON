import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return (
    <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Afficher</span>
        <select 
          className="form-input form-select" 
          style={{ width: '70px', padding: '0.25rem 1.5rem 0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.875rem' }}
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1); // Reset to page 1 when changing items per page
          }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          sur {totalItems} entrées
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button 
          className="btn btn-secondary btn-icon" 
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: '0.25rem', opacity: currentPage === 1 ? 0.5 : 1 }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0 0.5rem' }}>
          Page {currentPage} sur {totalPages}
        </span>
        <button 
          className="btn btn-secondary btn-icon" 
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: '0.25rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
