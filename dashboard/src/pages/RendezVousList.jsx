import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { 
  Search, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  CalendarClock, 
  Phone, 
  RefreshCw, 
  SlidersHorizontal,
  Check,
  X,
  CalendarDays,
  Building,
  Info,
  UserCheck,
  UserX
} from 'lucide-react';

export default function RendezVousList({ token, currentUser }) {
  const [rendezVous, setRendezVous] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Reschedule Modal State
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayString = getTodayString();

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchRendezVous = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/rendez-vous/agent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRendezVous(data.data || []);
      } else {
        setError(data.message || 'Erreur lors du chargement des rendez-vous');
      }
    } catch (err) {
      setError('Erreur de connexion avec le serveur');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRendezVous();
  }, [token]);

  const handleStatusChange = async (id, newStatut) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rendez-vous/${id}/statut`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statut: newStatut })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Rendez-vous mis à jour avec le statut : ${newStatut}`);
        fetchRendezVous(true);
      } else {
        showNotification(data.message || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (err) {
      showNotification('Erreur de connexion', 'error');
    }
  };

  const handleConfirm = async (id) => {
    if (window.confirm('Voulez-vous vraiment confirmer ce rendez-vous ?')) {
      await handleStatusChange(id, 'CONFIRME');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) {
      await handleStatusChange(id, 'ANNULE');
    }
  };

  const fetchSlotsForDateAndItem = async (date, item) => {
    if (!date || !item) return;
    setSlotsLoading(true);
    setSlotsError('');
    setAvailableSlots([]);
    try {
      const res = await fetch(`${API_BASE_URL}/rendez-vous/disponibilites?centreId=${item.centreId}&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const formatted = (data.data || []).map(timeStr => {
          const parts = timeStr.split(':');
          return `${parts[0]}:${parts[1]}`;
        });
        setAvailableSlots(formatted);
      } else {
        setSlotsError(data.message || 'Erreur lors de la récupération des créneaux');
      }
    } catch (err) {
      setSlotsError('Erreur de connexion');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !selectedSlot) {
      showNotification('Veuillez choisir une date et un créneau', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rendez-vous/${rescheduleItem.id}/reporter`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: rescheduleDate,
          heure: selectedSlot
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Le rendez-vous a été reporté avec succès !');
        setRescheduleItem(null);
        fetchRendezVous(true);
      } else {
        showNotification(data.message || 'Erreur lors du report', 'error');
      }
    } catch (err) {
      showNotification('Erreur de connexion', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Safe formatting helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Statistics calculation
  const totalToday = rendezVous.filter(rv => rv.date === todayString).length;
  const confirmedCount = rendezVous.filter(rv => rv.statut === 'CONFIRME' || rv.statut === 'EFFECTUE').length;
  const pendingReportedCount = rendezVous.filter(rv => rv.statut === 'REPORTE' || rv.statut === 'EN_ATTENTE').length;
  const cancelledCount = rendezVous.filter(rv => rv.statut === 'ANNULE').length;

  // Filtering
  const filteredRendezVous = rendezVous.filter(rv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchNom = rv.citoyenNom ? rv.citoyenNom.toLowerCase().includes(q) : false;
      const matchTel = rv.citoyenTelephone ? rv.citoyenTelephone.toLowerCase().includes(q) : false;
      const matchNum = rv.numeroRendezVous ? rv.numeroRendezVous.toLowerCase().includes(q) : false;
      const matchRef = rv.demandeReference ? rv.demandeReference.toLowerCase().includes(q) : false;
      const matchAct = rv.activiteNom ? rv.activiteNom.toLowerCase().includes(q) : false;

      if (!matchNom && !matchTel && !matchNum && !matchRef && !matchAct) {
        return false;
      }
    }

    if (filterDate && rv.date !== filterDate) {
      return false;
    }

    if (filterStatut && rv.statut !== filterStatut) {
      return false;
    }

    return true;
  });

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'CONFIRME': 
        return <span className="badge badge-info">Confirmé</span>;
      case 'EFFECTUE': 
        return <span className="badge badge-success">Effectué</span>;
      case 'ABSENT': 
        return <span className="badge badge-danger">Absent</span>;
      case 'ANNULE': 
        return <span className="badge badge-danger">Annulé</span>;
      case 'REPORTE': 
        return <span className="badge badge-warning">Reporté</span>;
      default: 
        return <span className="badge badge-secondary">{statut}</span>;
    }
  };

  const isOfficer = currentUser?.permissions?.some(p => ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_SERVICES'].includes(p));

  const renderActions = (rv) => {
    if (isOfficer) return null;
    if (rv.statut === 'ANNULE' || rv.statut === 'EFFECTUE' || rv.statut === 'ABSENT') {
      return <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Terminé</span>;
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        {rv.statut !== 'CONFIRME' && (
          <button 
            className="btn btn-secondary btn-sm" 
            title="Confirmer le rendez-vous"
            onClick={() => handleConfirm(rv.id)}
            style={{ color: 'var(--success)', padding: '0.25rem 0.5rem' }}
          >
            <Check size={16} />
          </button>
        )}
        {(rv.statut === 'CONFIRME' || rv.statut === 'REPORTE') && (
          <>
            <button 
              className="btn btn-secondary btn-sm" 
              title="Marquer comme Présent"
              onClick={() => {
                if (window.confirm('Voulez-vous marquer ce citoyen comme Présent ?')) {
                  handleStatusChange(rv.id, 'EFFECTUE');
                }
              }}
              style={{ color: 'var(--success)', padding: '0.25rem 0.5rem' }}
            >
              <UserCheck size={16} />
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              title="Marquer comme Absent"
              onClick={() => {
                if (window.confirm('Voulez-vous marquer ce citoyen comme Absent ?')) {
                  handleStatusChange(rv.id, 'ABSENT');
                }
              }}
              style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }}
            >
              <UserX size={16} />
            </button>
          </>
        )}
        <button 
          className="btn btn-secondary btn-sm" 
          title="Reporter / Reprogrammer"
          onClick={() => {
            setRescheduleItem(rv);
            setRescheduleDate(rv.date);
            setSelectedSlot('');
            fetchSlotsForDateAndItem(rv.date, rv);
          }}
          style={{ color: 'var(--warning)', padding: '0.25rem 0.5rem' }}
        >
          <Calendar size={16} />
        </button>
        <button 
          className="btn btn-secondary btn-sm" 
          title="Annuler le rendez-vous"
          onClick={() => handleCancel(rv.id)}
          style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }}
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Encapsulated Custom Style Block */}
      <style dangerouslySetInnerHTML={{__html: `
        .rv-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .rv-stat-card {
          background: var(--bg-card);
          backdrop-filter: var(--backdrop-blur);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rv-stat-card:hover {
          background: var(--bg-card-hover);
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        .rv-stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rv-stat-info {
          display: flex;
          flex-direction: column;
        }
        .rv-stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .rv-stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .rv-filters-card {
          background: var(--bg-card);
          backdrop-filter: var(--backdrop-blur);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          margin-bottom: 2rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          align-items: flex-end;
        }
        .rv-filter-group {
          flex: 1;
          min-width: 200px;
        }
        .rv-filter-group.search {
          flex: 1.5;
          min-width: 250px;
        }
        .rv-filter-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .rv-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rv-input-icon {
          position: absolute;
          left: 0.875rem;
          color: var(--text-muted);
          pointer-events: none;
        }
        .rv-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }
        .rv-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .rv-select {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1.25rem;
          padding-right: 2.5rem;
        }
        .rv-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .rv-date-shortcuts {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .rv-shortcut-btn {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .rv-shortcut-btn:hover {
          background: var(--primary-glow);
          color: var(--primary);
          border-color: var(--primary);
        }
        .rv-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: rv-spin 0.8s linear infinite;
        }
        @keyframes rv-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />

      {/* Custom toast notification */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: notification.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: notification.type === 'error' ? '#ef4444' : '#10b981',
            border: `1px solid ${notification.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex-space mb-6">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            📅 Agenda des Rendez-vous
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Gérez et validez les rendez-vous physiques planifiés par les citoyens.
          </p>
        </div>
        
        {currentUser?.centre_nom && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-glow)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            <Building size={16} />
            <span>{currentUser.centre_nom}</span>
          </div>
        )}
      </div>

      {/* Info Isolation Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        lineHeight: 1.4,
        marginBottom: '2rem'
      }}>
        <Info size={18} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Isolation de sécurité active :</strong> {
            (currentUser?.permissions?.some(p => ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_SERVICES'].includes(p))) 
              ? `En tant que responsable, vous pouvez voir et modifier tous les rendez-vous qui concernent le centre ${currentUser?.centre_nom || ''}.`
              : 'En tant qu\'agent instructeur, vous ne voyez que les rendez-vous associés aux dossiers que vous avez pris en charge.'
          }
        </div>
      </div>

      {/* Key Stats Cards Grid */}
      <div className="rv-stats-grid">
        {/* Stat 1: Today's Total */}
        <div 
          className="rv-stat-card" 
          style={{ cursor: 'pointer' }} 
          onClick={() => { setFilterDate(todayString); setFilterStatut(''); }}
          title="Filtrer pour aujourd'hui"
        >
          <div className="rv-stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <CalendarClock size={24} />
          </div>
          <div className="rv-stat-info">
            <span className="rv-stat-value">{totalToday}</span>
            <span className="rv-stat-label">Aujourd'hui</span>
          </div>
        </div>

        {/* Stat 2: Confirmed Total */}
        <div 
          className="rv-stat-card" 
          style={{ cursor: 'pointer' }} 
          onClick={() => { setFilterStatut('CONFIRME'); setFilterDate(''); }}
          title="Filtrer pour les confirmés"
        >
          <div className="rv-stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="rv-stat-info">
            <span className="rv-stat-value">{confirmedCount}</span>
            <span className="rv-stat-label">Confirmés / Effectués</span>
          </div>
        </div>

        {/* Stat 3: Reported Total */}
        <div 
          className="rv-stat-card" 
          style={{ cursor: 'pointer' }} 
          onClick={() => { setFilterStatut('REPORTE'); setFilterDate(''); }}
          title="Filtrer pour les reportés"
        >
          <div className="rv-stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="rv-stat-info">
            <span className="rv-stat-value">{pendingReportedCount}</span>
            <span className="rv-stat-label">Reportés / Attente</span>
          </div>
        </div>

        {/* Stat 4: Cancelled Total */}
        <div 
          className="rv-stat-card" 
          style={{ cursor: 'pointer' }} 
          onClick={() => { setFilterStatut('ANNULE'); setFilterDate(''); }}
          title="Filtrer pour les annulés"
        >
          <div className="rv-stat-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={24} />
          </div>
          <div className="rv-stat-info">
            <span className="rv-stat-value">{cancelledCount}</span>
            <span className="rv-stat-label">Annulés</span>
          </div>
        </div>
      </div>

      {/* Dynamic Search & Filters Toolbar */}
      <div className="rv-filters-card">
        {/* Dynamic Search Query */}
        <div className="rv-filter-group search">
          <label className="rv-filter-label">Recherche dynamique</label>
          <div className="rv-input-wrapper">
            <Search size={18} className="rv-input-icon" />
            <input 
              type="text" 
              className="rv-input"
              placeholder="Rechercher par nom, téléphone, référence, acte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Date Filter */}
        <div className="rv-filter-group">
          <label className="rv-filter-label">Filtrer par date</label>
          <div className="rv-input-wrapper">
            <Calendar size={18} className="rv-input-icon" />
            <input 
              type="date" 
              className="rv-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {/* Quick Shortcuts */}
          <div className="rv-date-shortcuts">
            <button 
              type="button"
              className={`rv-shortcut-btn ${filterDate === todayString ? 'active' : ''}`}
              onClick={() => setFilterDate(todayString)}
            >
              Aujourd'hui
            </button>
            <button 
              type="button"
              className={`rv-shortcut-btn ${filterDate === '' ? 'active' : ''}`}
              onClick={() => setFilterDate('')}
            >
              Tous les jours
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="rv-filter-group" style={{ minWidth: '180px' }}>
          <label className="rv-filter-label">Statut</label>
          <select 
            className="rv-select" 
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="CONFIRME">Confirmé</option>
            <option value="EFFECTUE">Effectué</option>
            <option value="REPORTE">Reporté</option>
            <option value="ABSENT">Absent</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>

        {/* Reset / Count Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => {
              setSearchQuery('');
              setFilterDate(todayString);
              setFilterStatut('');
            }}
            style={{ padding: '0.65rem 1.25rem' }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Results Count Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {filteredRendezVous.length} rendez-vous trouvé{filteredRendezVous.length !== 1 ? 's' : ''}
        </span>
        <button 
          onClick={() => fetchRendezVous(false)}
          className="rv-shortcut-btn" 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem' }}
          title="Rafraîchir les données"
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {/* Appointments List Card */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
            <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Chargement des rendez-vous...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.8 }} />
            <p style={{ textAlign: 'center', fontWeight: 600 }}>{error}</p>
          </div>
        ) : filteredRendezVous.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CalendarDays size={48} style={{ margin: '0 auto 1.25rem', opacity: 0.4, color: 'var(--text-muted)' }} />
            <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>Aucun rendez-vous planifié</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Aucun créneau ne correspond à vos filtres de recherche actuels.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° RDV</th>
                  <th>Citoyen</th>
                  <th>Type de document / Acte</th>
                  <th>Date &amp; Heure</th>
                  <th>Statut</th>
                  {!isOfficer && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRendezVous.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rv) => (
                  <tr key={rv.id}>
                    {/* Number / Dossier */}
                    <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                      <div>{rv.numeroRendezVous}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>
                        Ref: {rv.demandeReference || 'N/A'}
                      </div>
                    </td>

                    {/* Citizen Details */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <User size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{rv.citoyenNom || 'Anonyme'}</span>
                        </div>
                        {rv.citoyenTelephone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{rv.citoyenTelephone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Activity (Document Type) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 550, color: 'var(--text-primary)' }}>{rv.activiteNom || 'Acte Civil'}</span>
                      </div>
                    </td>

                    {/* Appointment Date & Time */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{formatDate(rv.date)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>{formatTime(rv.heure)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {getStatusBadge(rv.statut)}
                    </td>

                    {/* Interactive Actions */}
                    {!isOfficer && (
                      <td style={{ textAlign: 'right' }}>
                        {renderActions(rv)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination 
              currentPage={currentPage} 
              totalItems={filteredRendezVous.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Reprogrammer le rendez-vous</h3>
              <button className="modal-close" onClick={() => setRescheduleItem(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                N° RDV : <strong style={{ color: 'var(--text-primary)' }}>{rescheduleItem.numeroRendezVous}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Citoyen : <strong style={{ color: 'var(--text-primary)' }}>{rescheduleItem.citoyenNom}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Démarche : <strong style={{ color: 'var(--text-primary)' }}>{rescheduleItem.activiteNom}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Nouvelle Date</label>
              <div className="rv-input-wrapper">
                <Calendar size={18} className="rv-input-icon" />
                <input 
                  type="date" 
                  className="rv-input" 
                  value={rescheduleDate}
                  min={todayString}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setSelectedSlot('');
                    fetchSlotsForDateAndItem(e.target.value, rescheduleItem);
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Créneau Horaire Disponible</label>
              {slotsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                  <div className="rv-spinner" style={{ marginBottom: '0.5rem' }}></div>
                  <span style={{ fontSize: '0.9rem' }}>Recherche des créneaux libres...</span>
                </div>
              ) : slotsError ? (
                <div style={{ color: 'var(--danger)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
                  {slotsError}
                </div>
              ) : availableSlots.length === 0 ? (
                <div style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem', 
                  padding: '1.25rem', 
                  textAlign: 'center', 
                  background: '#f8fafc', 
                  borderRadius: '10px', 
                  border: '1px dashed var(--border-color)',
                  lineHeight: 1.4
                }}>
                  {rescheduleDate ? "Aucun créneau disponible pour cette date. Veuillez choisir un autre jour ouvrable (lundi au vendredi)." : "Veuillez sélectionner une date pour afficher les créneaux disponibles."}
                </div>
              ) : (
                <div className="rv-slots-grid">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      className={`rv-slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setRescheduleItem(null)}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!rescheduleDate || !selectedSlot || actionLoading}
                onClick={handleRescheduleSubmit}
                style={{ minWidth: '140px' }}
              >
                {actionLoading ? 'Mise à jour...' : 'Reporter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
