import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect, useRef } from 'react';
import JoditEditor from 'jodit-react';
import { ArrowLeft, Save, Upload } from 'lucide-react';

export default function TemplateBuilder({ activities, template, onClose }) {
  const [formData, setFormData] = useState({
    nom: '',
    activite_id: '',
    type: 'HTML',
    content_html: '',
    fichier_docx_url: ''
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [champsAgent, setChampsAgent] = useState([]);
  const [availableVariables, setAvailableVariables] = useState([]);
  const editorRef = useRef(null);
  
  // Nouveaux états pour la cascade
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);

  // Déduire les bureaux et services depuis les activités disponibles
  const bureaux = Array.from(new Map(
    activities.filter(a => a.bureau_id).map(a => [a.bureau_id, { id: a.bureau_id, nom: a.bureau_nom }])
  ).values());

  const services = Array.from(new Map(
    activities.filter(a => a.service_id).map(a => [a.service_id, { id: a.service_id, nom: a.service_nom, bureau_id: a.bureau_id }])
  ).values());

  const handleInsertVariable = (tag) => {
    if (formData.type === 'HTML') {
      let inserted = false;
      try {
        const jodit = (editorRef.current && editorRef.current.editor) ? editorRef.current.editor : editorRef.current;
        if (jodit && jodit.s && jodit.s.insertNode) {
            const textNode = jodit.createInside.text(tag);
            jodit.s.insertNode(textNode);
            inserted = true;
        } else if (jodit && jodit.selection && jodit.selection.insertHTML) {
            jodit.selection.insertHTML(tag);
            inserted = true;
        }
      } catch (err) {
        console.error("Erreur insertion Jodit:", err);
      }
      if (!inserted) {
         setFormData(prev => ({ ...prev, content_html: prev.content_html + ' ' + tag }));
      }
    }
    
    // Toujours copier dans le presse-papier pour faciliter l'utilisation (notamment pour Word)
    navigator.clipboard.writeText(tag).then(() => {
        // Optionnel : un petit toast ou feedback visuel léger
    });
  };

  useEffect(() => {
    if (selectedBureau) {
        const filtered = services.filter(s => s.bureau_id === parseInt(selectedBureau));
        setFilteredServices(filtered);
    } else {
        setFilteredServices([]);
    }
  }, [selectedBureau, activities]);

  useEffect(() => {
    if (selectedService) {
        setFilteredActivities(activities.filter(a => a.service_id === parseInt(selectedService)));
    } else {
        setFilteredActivities([]);
    }
  }, [selectedService, activities]);

  useEffect(() => {
    if (formData.activite_id) {
        fetch(`${API_BASE_URL}/document-templates/variables/${formData.activite_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setAvailableVariables(data);
            }
        })
        .catch(err => console.error("Erreur chargement variables", err));
    } else {
        setAvailableVariables([]);
    }
  }, [formData.activite_id]);

  useEffect(() => {
    if (template) {
      setFormData({
        nom: template.nom,
        activite_id: template.activite?.id || '',
        type: template.type,
        content_html: template.contentHtml || '',
        fichier_docx_url: template.fichierDocxUrl || ''
      });
      // Initialiser la cascade si on édite un modèle existant
      if (template.activite) {
        const act = activities.find(a => a.id === template.activite.id);
        if (act && act.service) {
          setSelectedService(act.service.id.toString());
          if (act.service.bureau) {
            setSelectedBureau(act.service.bureau.id.toString());
          } else if (services.length > 0) {
            // Find bureau_id from services list
            const srv = services.find(s => s.id === act.service.id);
            if (srv && srv.bureau_id) {
                setSelectedBureau(srv.bureau_id.toString());
            }
          }
        }
      }
      if (template.champsAgent) {
        try {
          setChampsAgent(typeof template.champsAgent === 'string' ? JSON.parse(template.champsAgent) : template.champsAgent);
        } catch(e) {
          setChampsAgent([]);
        }
      }
    }
  }, [template, activities, services]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuillChange = (content) => {
    setFormData(prev => ({ ...prev, content_html: content }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) return formData.fichier_docx_url;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/document-templates/upload-docx`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: form
    });
    if (!res.ok) throw new Error("Erreur upload");
    return await res.text(); // the URL
  };

  const handleSave = async () => {
    if (!formData.nom || !formData.activite_id) {
      alert("Veuillez remplir les champs obligatoires (Nom et Activité).");
      return;
    }
    
    if (formData.type === 'DOCX' && !file && !formData.fichier_docx_url) {
      alert("Veuillez importer un fichier Word (.docx).");
      return;
    }

    setSaving(true);
    try {
      let docxUrl = formData.fichier_docx_url;
      if (formData.type === 'DOCX' && file) {
        docxUrl = await uploadFile();
      }

      const payload = {
        id: template?.id,
        nom: formData.nom,
        activite: { id: parseInt(formData.activite_id) },
        type: formData.type,
        contentHtml: formData.type === 'HTML' ? formData.content_html : null,
        fichierDocxUrl: formData.type === 'DOCX' ? docxUrl : null,
        champsAgent: champsAgent,
        actif: true
      };

      const res = await fetch(`${API_BASE_URL}/document-templates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onClose();
      } else {
        const errText = await res.text();
        alert("Erreur lors de la sauvegarde: " + errText);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} style={{ marginRight: '0.5rem' }}/> Retour
          </button>
          <h1 className="text-3xl font-bold" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{template ? 'Modifier le Modèle' : 'Créer un Modèle'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center' }}>
          <Save size={18} style={{ marginRight: '0.5rem' }} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Informations du Modèle</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Bureau *</label>
                <select 
                  className="form-input form-select"
                  value={selectedBureau}
                  onChange={(e) => {
                      setSelectedBureau(e.target.value);
                      setSelectedService('');
                      setFormData(prev => ({ ...prev, activite_id: '' }));
                  }}
                >
                  <option value="">Sélectionnez un bureau</option>
                  {bureaux.map(b => (
                    <option key={b.id} value={b.id}>{b.nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service *</label>
                <select 
                  className="form-input form-select"
                  value={selectedService}
                  onChange={(e) => {
                      setSelectedService(e.target.value);
                      setFormData(prev => ({ ...prev, activite_id: '' }));
                  }}
                  disabled={!selectedBureau}
                >
                  <option value="">Sélectionnez un service</option>
                  {filteredServices.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Activité associée *</label>
                <select 
                  name="activite_id" 
                  value={formData.activite_id} 
                  onChange={handleChange}
                  className="form-input form-select"
                  disabled={!selectedService}
                >
                  <option value="">Sélectionnez une activité</option>
                  {filteredActivities.map(act => (
                    <option key={act.id} value={act.id}>{act.nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nom du Modèle *</label>
                <input className="form-input" name="nom" value={formData.nom} onChange={handleChange} placeholder="ex: Acte Standard V1" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Format du document</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" value="HTML" checked={formData.type === 'HTML'} onChange={handleChange} />
                  <span>Éditeur Web (HTML vers PDF)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="type" value="DOCX" checked={formData.type === 'DOCX'} onChange={handleChange} />
                  <span>Fichier Word (Import .docx)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Contenu du Modèle</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Utilisez les tags dynamiques (ex: {`{{citoyen.nom_complet}}`}) qui seront remplacés automatiquement lors de la génération.
            </p>
            <div>
              {formData.type === 'HTML' ? (
                <div style={{ height: '400px', marginBottom: '1rem', background: '#fff' }}>
                  <JoditEditor
                    ref={editorRef}
                    value={formData.content_html}
                    config={{ height: 400, readonly: false, allowResizeX: false, allowResizeY: false }}
                    onBlur={newContent => handleQuillChange(newContent)}
                    onChange={() => {}}
                  />
                </div>
              ) : (
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                  <Upload size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                  <label style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }}>
                    <span>Importer un fichier .docx</span>
                    <input type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {file ? file.name : formData.fichier_docx_url ? 'Fichier actuel: ' + formData.fichier_docx_url : 'Aucun fichier sélectionné'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Champs pour l'Agent (Vérificateur)</h3>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setChampsAgent([...champsAgent, { nom_champ: 'nouveau_champ', label: 'Nouveau Champ', type: 'text' }])}
              >
                + Ajouter un champ
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Définissez les informations (ex: N° Registre, Signataire) que l'agent local devra obligatoirement remplir au moment de générer le document final.
            </p>
            {champsAgent.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun champ spécifique à l'agent n'est défini.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {champsAgent.map((champ, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px' }}>
                    <input 
                      className="form-input" 
                      placeholder="Label (ex: Signataire)" 
                      value={champ.label} 
                      onChange={e => {
                        const newChamps = [...champsAgent];
                        newChamps[index].label = e.target.value;
                        // auto-generate nom_champ if empty or untouched mostly
                        newChamps[index].nom_champ = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        setChampsAgent(newChamps);
                      }} 
                    />
                    <input 
                      className="form-input" 
                      placeholder="Nom (variable)" 
                      value={champ.nom_champ} 
                      onChange={e => {
                        const newChamps = [...champsAgent];
                        newChamps[index].nom_champ = e.target.value.replace(/[^a-z0-9_]/g, '');
                        setChampsAgent(newChamps);
                      }} 
                    />
                    <select 
                      className="form-input form-select" 
                      value={champ.type} 
                      onChange={e => {
                        const newChamps = [...champsAgent];
                        newChamps[index].type = e.target.value;
                        setChampsAgent(newChamps);
                      }}
                    >
                      <option value="text">Texte court</option>
                      <option value="number">Nombre</option>
                      <option value="date">Date</option>
                    </select>
                    <button 
                      className="btn btn-danger btn-icon" 
                      onClick={() => {
                        const newChamps = champsAgent.filter((_, i) => i !== index);
                        setChampsAgent(newChamps);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="glass-card" style={{ position: 'sticky', top: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Variables Disponibles</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Cliquez sur le bouton pour copier</p>
            
            {formData.activite_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {availableVariables.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#166534' }}>Variables du Formulaire</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {availableVariables
                        .filter(v => !['region', 'departement', 'commune', 'centre', 'qr_code', 'date'].includes(v))
                        .map((varName, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #dcfce7' }}>
                          <span style={{ fontWeight: '500', color: '#166534' }}>{varName}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <code style={{ fontSize: '0.7rem', color: '#15803d', opacity: 0.8 }}>{`{{${varName}}}`}</code>
                              <button 
                                onClick={(e) => { e.preventDefault(); handleInsertVariable(`{{${varName}}}`); alert("Copié !"); }} 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                                title="Copier la variable"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Aucune variable du formulaire.
                  </div>
                )}

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#6b21a8' }}>Système & Géographie</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {[
                      { label: "Réf. Demande", varName: "demande.reference" },
                      { label: "Année de Demande", varName: "demande.annee" },
                      { label: "Numéro de Demande", varName: "demande.numero" },
                      { label: "Date de soumission", varName: "demande.date" },
                      { label: "Date d'édition (Ex: le 12/mars/2026)", varName: "demande.date_actuelle" },
                      { label: "Région", varName: "demande.region" },
                      { label: "Département", varName: "demande.departement" },
                      { label: "Commune", varName: "demande.commune" },
                      { label: "Centre", varName: "demande.centre" },
                      { label: "Nom du citoyen", varName: "citoyen.nom_complet" },
                      { label: "Tél du citoyen", varName: "citoyen.telephone" }
                    ].map((item, idx) => (
                      <li key={`sys-${idx}`} style={{ fontSize: '0.85rem', background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3e8ff' }}>
                        <span style={{ fontWeight: '500', color: '#6b21a8' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <code style={{ fontSize: '0.7rem', color: '#7e22ce', opacity: 0.8 }}>{`{{${item.varName}}}`}</code>
                            <button 
                              onClick={(e) => { e.preventDefault(); handleInsertVariable(`{{${item.varName}}}`); alert("Copié !"); }} 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                              title="Copier la variable"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#b91c1c' }}>Officier (Connecté)</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {[
                      { label: "Nom Officier", varName: "officier.nom_complet" },
                      { label: "Signature", varName: "officier.signature" },
                      { label: "Cachet", varName: "officier.cachet" }
                    ].map((item, idx) => (
                      <li key={`off-${idx}`} style={{ fontSize: '0.85rem', background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fecaca' }}>
                        <span style={{ fontWeight: '500', color: '#b91c1c' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <code style={{ fontSize: '0.7rem', color: '#dc2626', opacity: 0.8 }}>{`{{${item.varName}}}`}</code>
                            <button 
                              onClick={(e) => { e.preventDefault(); handleInsertVariable(`{{${item.varName}}}`); alert("Copié !"); }} 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                              title="Copier la variable"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: '0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #bae6fd', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { handleInsertVariable('{{qr_code}}'); alert('Copié !'); }}>
                  <div>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Sécurité</h4>
                    <code>{`{{qr_code}}`}</code>
                  </div>
                  <button className="btn btn-secondary btn-icon" style={{ padding: '0.2rem', width: '24px', height: '24px', background: '#fff', borderColor: '#bae6fd', color: '#0369a1' }} title="Copier">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>

                {champsAgent.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Agent / Officier</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {champsAgent.map((champ, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>{champ.label || champ.nom_champ}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <code style={{ fontSize: '0.7rem', color: 'var(--primary)', opacity: 0.8 }}>{`{{agent.${champ.nom_champ}}}`}</code>
                              <button 
                                onClick={(e) => { e.preventDefault(); handleInsertVariable(`{{agent.${champ.nom_champ}}}`); alert("Copié !"); }} 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                                title="Copier"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Veuillez sélectionner une activité associée pour voir les variables disponibles.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
