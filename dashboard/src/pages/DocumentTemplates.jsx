import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { Plus, Trash, Edit, FileText, File } from 'lucide-react';
import TemplateBuilder from '../components/TemplateBuilder';
import ErrorBoundary from '../components/ErrorBoundary';

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [tplRes, actRes] = await Promise.all([
        fetch(`${API_BASE_URL}/document-templates`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_BASE_URL}/activities?withChamps=true`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (actRes.ok) {
        const actData = await actRes.json();
        console.log("ACT DATA:", actData);
        setActivities(actData.data?.activities || actData.activities || actData);
      }
    } catch (error) {
      console.error("Erreur de chargement des modèles", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/document-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTogglePrincipal = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/document-templates/${id}/principal`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchData();
      } else {
        alert("Erreur lors de la définition du modèle principal");
      }
    } catch (error) {
      console.error("Erreur toggle principal", error);
    }
  };

  if (showBuilder) {
    return (
      <ErrorBoundary>
        <TemplateBuilder 
          activities={Array.isArray(activities) ? activities : []}
          template={editingTemplate}
          onClose={() => {
            setShowBuilder(false);
            setEditingTemplate(null);
            fetchData();
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="text-3xl font-bold" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Modèles de Documents</h1>
          <p className="text-gray-500" style={{ color: 'var(--text-secondary)' }}>Gérez les modèles de sortie pour chaque type de demande.</p>
        </div>
        <button onClick={() => setShowBuilder(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center' }}>
          <Plus className="w-5 h-5" style={{ marginRight: '0.5rem' }} />
          Nouveau Modèle
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="loading-spinner"></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {Array.isArray(templates) ? templates.map(tpl => (
            <div key={tpl.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {tpl.type === 'HTML' ? <FileText size={20} style={{ color: '#3b82f6' }} /> : <File size={20} style={{ color: '#2563eb' }} />}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{tpl.nom}</h3>
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Activité: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.activite?.nom}</span>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '999px' }}>{tpl.type}</span>
                  {tpl.actif ? (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '999px' }}>Actif</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '999px' }}>Inactif</span>
                  )}
                  {tpl.principal && (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f59e0b', color: '#fff', borderRadius: '999px', fontWeight: 'bold' }}>⭐ Principal</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                {!tpl.principal ? (
                  <button onClick={() => handleTogglePrincipal(tpl.id)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                    Rendre Principal
                  </button>
                ) : <div/>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-icon" onClick={() => { setEditingTemplate(tpl); setShowBuilder(true); }}>
                    <Edit size={16} />
                  </button>
                  <button className="btn btn-danger btn-icon" onClick={() => handleDelete(tpl.id)}>
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ color: 'red' }}>Erreur: templates n'est pas un tableau. Valeur: {JSON.stringify(templates)}</div>
          )}
          {Array.isArray(templates) && templates.length === 0 && (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
             Aucun modèle de document configuré. Créez-en un nouveau !
           </div>
          )}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
