import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Search, Banknote, Calendar, CreditCard, Activity, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function TransactionsList({ token, currentUser }) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [modePaiementFilter, setModePaiementFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch logic
  const fetchTransactions = async () => {
    const params = new URLSearchParams({
      page: currentPage - 1,
      size: itemsPerPage
    });
    if (search) params.append('search', search);
    if (modePaiementFilter) params.append('modePaiement', modePaiementFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const res = await fetch(`${API_BASE_URL}/dashboard/transactions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Erreur lors de la récupération des transactions');
    }
    return res.json();
  };

  const { data: queryData, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', currentPage, itemsPerPage, search, modePaiementFilter, startDate, endDate],
    queryFn: fetchTransactions,
    keepPreviousData: true
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  };

  const responseData = queryData?.data || {};
  const transactions = responseData.transactions || [];
  const totalElements = responseData.totalElements || 0;
  const totalRevenue = responseData.totalRevenue || 0;

  // Formatting utils
  const formatMoney = (amount) => {
    if (amount == null) return "0 FCFA";
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  };

  const getModeBadge = (mode) => {
    if (!mode) return <span className="badge badge-secondary">Inconnu</span>;
    switch (mode.toLowerCase()) {
      case 'orange_money':
      case 'orange money':
        return <span className="badge" style={{ backgroundColor: 'rgba(255, 121, 0, 0.15)', color: '#FF7900', border: '1px solid #FF7900' }}>Orange Money</span>;
      case 'wave':
        return <span className="badge" style={{ backgroundColor: 'rgba(28, 194, 255, 0.15)', color: '#0084FF', border: '1px solid #1CC2FF' }}>Wave</span>;
      case 'free_money':
      case 'free money':
        return <span className="badge" style={{ backgroundColor: 'rgba(5, 150, 105, 0.15)', color: '#059669', border: '1px solid #059669' }}>Free Money</span>;
      case 'carte_bancaire':
      case 'carte':
        return <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', border: '1px solid #6366F1' }}>Carte Bancaire</span>;
      case 'paytech':
        return <span className="badge" style={{ backgroundColor: 'rgba(0, 112, 178, 0.15)', color: '#0070b2', border: '1px solid #0070b2' }}>PayTech</span>;
      case 'especes':
      case 'espèces':
        return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid #10B981' }}>Espèces</span>;
      default:
        return <span className="badge badge-info">{mode}</span>;
    }
  };

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            💳 Suivi des Transactions & Paiements
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez l'historique des paiements effectués pour les demandes de pièces administratives.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <Banknote size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Encaissé</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {formatMoney(totalRevenue)}
            </div>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nombre de Transactions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {totalElements}
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher par référence, citoyen..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                className="form-input form-select"
                value={modePaiementFilter}
                onChange={(e) => { setModePaiementFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Tous les modes</option>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="free_money">Free Money</option>
                <option value="carte_bancaire">Carte Bancaire</option>
                <option value="paytech">PayTech</option>
                <option value="especes">Espèces</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Du:</label>
              <input 
                type="date" 
                className="form-input" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.35rem 0.75rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Au:</label>
              <input 
                type="date" 
                className="form-input" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.35rem 0.75rem' }}
              />
            </div>

            {(search || modePaiementFilter || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setModePaiementFilter('');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="btn"
                style={{
                  padding: '0.35rem 0.8rem',
                  border: '1px dashed var(--danger)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  color: 'var(--danger)',
                }}
              >
                <X size={14} style={{ marginRight: '4px' }} /> Effacer
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tableau */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error.message}
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucune transaction trouvée pour ces critères.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Citoyen</th>
                  <th>Activité</th>
                  <th>Mode Paiement</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {new Date(tx.date).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{tx.reference}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx.citoyen}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{tx.activite}</div>
                    </td>
                    <td>
                      {getModeBadge(tx.modePaiement)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatMoney(tx.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalElements > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalElements}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
