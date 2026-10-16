import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp,
  Settings, Eye, Check, X, ArrowLeft, HelpCircle,
  Type, AlignLeft, Hash, Calendar, Phone, List, Upload, Globe, MapPin, Building, Landmark, Users, Clock, Heading
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  const config = {
    method: options.method || 'GET',
    headers,
    cache: 'no-store',
  };
  if (options.bodyData) {
    config.body = JSON.stringify(options.bodyData);
  }
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Une erreur est survenue.');
  return data;
};

const FIELD_TYPES = [
  { value: 'text',        label: 'Texte court',          iconName: 'Type' },
  { value: 'textarea',    label: 'Texte long',            iconName: 'AlignLeft' },
  { value: 'number',      label: 'Nombre',                iconName: 'Hash' },
  { value: 'date',        label: 'Date',                  iconName: 'Calendar' },
  { value: 'time',        label: 'Heure',                 iconName: 'Clock' },
  { value: 'phone',       label: 'Téléphone',             iconName: 'Phone' },
  { value: 'select',      label: 'Liste déroulante',      iconName: 'List' },
  { value: 'yesno',       label: 'Question Oui/Non',      iconName: 'HelpCircle' },
  { value: 'file',        label: 'Fichier / Document',    iconName: 'Upload' },
  { value: 'region',      label: 'Région (géo)',          iconName: 'Globe' },
  { value: 'departement', label: 'Département (géo)',     iconName: 'MapPin' },
  { value: 'commune',     label: 'Commune (géo)',         iconName: 'Building' },
  { value: 'centre',      label: "Centre d'état civil",   iconName: 'Landmark' },
  { value: 'sexe',        label: 'Sexe',                  iconName: 'Users' },
  { value: 'section',     label: 'Titre / Section',       iconName: 'Heading' },
];

const FieldIcon = ({ iconName, size = 16, className = "", style = {} }) => {
  const IconMap = {
    Type, AlignLeft, Hash, Calendar, Phone, List, Upload, Globe, MapPin, Building, Landmark, Users, HelpCircle, Clock, Heading
  };
  const Icon = IconMap[iconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} style={style} />;
};

const areOptionsEqual = (opts1, opts2) => {
  if (!opts1 || !opts2) return opts1 === opts2;
  if (opts1.length !== opts2.length) return false;
  return opts1.every((o, i) => o.value === opts2[i].value && o.label === opts2[i].label);
};
const generateUniqueFieldName = (allChamps) => {
  let maxNum = 0;
  (allChamps || []).forEach(c => {
    if (c.nom_champ && c.nom_champ.startsWith('champ_')) {
      const num = parseInt(c.nom_champ.replace('champ_', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  return `champ_${maxNum + 1}`;
};

const isChildField = (c, allChamps) => {
  if (!c || !c.conditions) return false;
  let cond = c.conditions;
  if (typeof cond === 'string') {
    try {
      cond = JSON.parse(cond);
    } catch (e) {
      return false;
    }
  }
  return cond && cond.field && allChamps.some(parent => parent.nom_champ === cond.field);
};
function FieldRow({ 
  champ, index, champs, onUpdate, onDelete, isFirst, isLast, accentColor, 
  activityMotifs = [], isChild = false, onAddChildField, onMoveChildField,
  sections = [], getParentSectionNom, moveFieldToSection
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState(() => (champ.options || []).map(o => `${o.value}=${o.label}`).join('\n'));

  useEffect(() => {
    const parsedCurrent = optionsText.split(/[,;\n]+/).filter(Boolean).map(line => {
      const match = line.match(/^([^=:]+)[=:](.*)$/);
      if (match) {
        const k = match[1].trim();
        const v = match[2].trim();
        return { value: k, label: v || k };
      } else {
        const k = line.trim();
        return { value: k, label: k };
      }
    });

    if (!areOptionsEqual(parsedCurrent, champ.options)) {
      setOptionsText((champ.options || []).map(o => `${o.value}=${o.label}`).join('\n'));
    }
  }, [champ.options]);

  const typeInfo = FIELD_TYPES.find(t => t.value === champ.type_champ) || FIELD_TYPES[0];

  const sortableProps = useSortable({ id: champ.id || champ.client_id || champ.nom_champ });
  const { attributes, listeners, setNodeRef, transform, transition } = sortableProps;
  const style = !isChild && transform ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : {};

  const childrenOui = !isChild ? champs.filter(c => c.conditions && c.conditions.field === champ.nom_champ && c.conditions.value === 'oui') : [];
  const childrenNon = !isChild ? champs.filter(c => c.conditions && c.conditions.field === champ.nom_champ && c.conditions.value === 'non') : [];

  return (
    <div 
      ref={!isChild ? setNodeRef : null} 
      style={{ 
        ...style, 
        borderLeft: `3px solid ${champ.type_champ === 'section' ? '#334155' : accentColor}`,
        ...(isChild ? { boxShadow: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', margin: '6px 0' } : {}),
        ...(champ.type_champ === 'section' ? { background: '#f1f5f9', border: '1px dashed #cbd5e1' } : {})
      }} 
      className={`field-row ${champ.type_champ === 'section' ? 'field-row-section' : ''}`}
    >
      <div className="field-row-header" onClick={() => setExpanded(!expanded)}>
        {isChild ? (
          <div className="field-drag" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => onMoveChildField(champ.nom_champ, 'up')} 
              disabled={isFirst}
              style={{ border: 'none', background: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.3 : 1, padding: 2 }}
              title="Monter"
            >
              <ChevronUp size={14} color="#64748b" />
            </button>
            <button 
              type="button" 
              onClick={() => onMoveChildField(champ.nom_champ, 'down')} 
              disabled={isLast}
              style={{ border: 'none', background: 'none', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.3 : 1, padding: 2 }}
              title="Descendre"
            >
              <ChevronDown size={14} color="#64748b" />
            </button>
          </div>
        ) : (
          <div {...attributes} {...listeners} className="field-drag" onClick={(e) => e.stopPropagation()} style={{ cursor: 'grab' }}>
            <GripVertical size={16} color="#94a3b8" />
            <span className="field-index">{index + 1}</span>
          </div>
        )}
        <div className="field-type-badge" style={{ display: 'flex', alignItems: 'center' }}>
          <FieldIcon iconName={typeInfo.iconName} size={13} style={{ marginRight: 6 }} />
          <span>{typeInfo.label}</span>
        </div>
        <div className="field-label-preview">
          {champ.label || <span style={{ color: '#94a3b8' }}>Sans label</span>}
          {champ.conditions && champ.conditions.field && (
             <span style={{ marginLeft: 8, fontSize: 10, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
               👁️ Conditionnel
             </span>
          )}
        </div>
        {champ.obligatoire && champ.type_champ !== 'section' && <span className="required-badge">Requis</span>}
        <div className="field-actions-inline" onClick={e => e.stopPropagation()}>
          <button className="icon-btn danger" onClick={() => onDelete(champ.nom_champ)} title="Supprimer">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
        </div>
      </div>

      {expanded && (
        <div className="field-editor">
          <div className="editor-grid">
            <div className="form-group">
              <label>Label affiché *</label>
              <input
                type="text"
                value={champ.label}
                onChange={e => {
                  const newLabel = e.target.value;
                  let updated = { ...champ, label: newLabel };
                  
                  // Auto-generate nom_champ from label if it's a new field to avoid generic 'champ_1'
                  if (champ._new) {
                    const slug = newLabel.toLowerCase()
                      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                      .replace(/[^a-z0-9]/g, '_')
                      .replace(/_+/g, '_')
                      .replace(/^_|_$/g, '');
                    
                    if (slug && slug.length > 0) {
                      // Ensure it's unique among OTHER fields
                      let baseSlug = slug;
                      let counter = 1;
                      while (champs.some(c => c.nom_champ === baseSlug && c !== champ)) {
                        baseSlug = `${slug}_${counter}`;
                        counter++;
                      }
                      updated.nom_champ = baseSlug;
                    }
                  }
                  onUpdate(champ.nom_champ, updated);
                }}
                placeholder="Ex: Prénom du titulaire"
              />
            </div>

            <div className="form-group">
              <label>Type de champ</label>
              <div className="select-with-icon">
                <div className="select-icon-wrapper" style={{ color: accentColor }}>
                  <FieldIcon iconName={typeInfo.iconName} size={16} />
                </div>
                <select
                  value={champ.type_champ}
                  onChange={e => onUpdate(champ.nom_champ, { ...champ, type_champ: e.target.value })}
                >
                  {FIELD_TYPES.filter(t => !isChild || t.value !== 'yesno').map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {champ.type_champ !== 'section' && !isChild && sections && sections.length > 0 && (
              <div className="form-group">
                <label>Section parente</label>
                <select
                  value={getParentSectionNom ? getParentSectionNom(champ) : '_default_'}
                  onChange={e => moveFieldToSection && moveFieldToSection(champ.nom_champ, e.target.value)}
                >
                  {sections.map(s => (
                    <option key={s.nom_champ} value={s.nom_champ}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Placeholder (Texte d'aide)</label>
              <input
                type="text"
                value={champ.placeholder || ''}
                onChange={e => onUpdate(champ.nom_champ, { ...champ, placeholder: e.target.value })}
                placeholder="Texte d'aide..."
              />
            </div>

            {champ.type_champ !== 'section' && (
              <div className="form-group toggle-group">
                <label>Propriété</label>
                <div className="toggle-card" onClick={() => onUpdate(champ.nom_champ, { ...champ, obligatoire: !champ.obligatoire })}>
                  <span className="toggle-card-label">Rendre ce champ obligatoire</span>
                  <div className={`switch-btn ${champ.obligatoire ? 'active' : ''}`}>
                    <div className="switch-dot"></div>
                  </div>
                </div>
              </div>
            )}

            {champ.type_champ === 'select' && (
              <div className="options-editor grid-full-width">
                <label>Options de la liste (séparées par une virgule, point-virgule ou retour à la ligne. Format : valeur=Libellé ou valeur:Libellé)</label>
                <textarea
                  rows={3}
                  value={optionsText}
                  onChange={e => {
                    const text = e.target.value;
                    setOptionsText(text);
                    const opts = text.split(/[,;\n]+/).filter(Boolean).map(line => {
                      const match = line.match(/^([^=:]+)[=:](.*)$/);
                      if (match) {
                        const k = match[1].trim();
                        const v = match[2].trim();
                        return { value: k, label: v || k };
                      } else {
                        const k = line.trim();
                        return { value: k, label: k };
                      }
                    });
                    onUpdate(champ.nom_champ, { ...champ, options: opts });
                  }}
                  placeholder={"m=Monsieur, f=Madame, mlle=Mademoiselle"}
                />
              </div>
            )}

            {activityMotifs && activityMotifs.length > 0 && (
              <div className="motifs-selector-section grid-full-width">
                <label className="section-subtitle">Ce champ s'applique aux motifs :</label>
                <div className="motifs-chip-list">
                  <button
                    type="button"
                    className={`motif-chip ${(!champ.conditions || !champ.conditions.motifs || champ.conditions.motifs.length === 0) && !champ.motif_lie ? 'active' : ''}`}
                    onClick={() => {
                      const newConditions = { ...(champ.conditions || {}), motifs: [] };
                      onUpdate(champ.nom_champ, { ...champ, conditions: newConditions, motif_lie: null });
                    }}
                    style={{ '--accent-color': accentColor }}
                  >
                    Tous les motifs (Général)
                  </button>
                  {activityMotifs.map((m, idx) => {
                    const isChecked = (champ.conditions && champ.conditions.motifs && champ.conditions.motifs.includes(m)) || champ.motif_lie === m;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`motif-chip ${isChecked ? 'active' : ''}`}
                        onClick={() => {
                          let currentMotifs = (champ.conditions && champ.conditions.motifs) ? [...champ.conditions.motifs] : [];
                          if (champ.motif_lie && !currentMotifs.includes(champ.motif_lie)) {
                            currentMotifs.push(champ.motif_lie);
                          }
                          if (!isChecked) {
                            if (!currentMotifs.includes(m)) currentMotifs.push(m);
                          } else {
                            currentMotifs = currentMotifs.filter(x => x !== m);
                          }
                          const newConditions = { ...(champ.conditions || {}), motifs: currentMotifs };
                          onUpdate(champ.nom_champ, { ...champ, conditions: newConditions, motif_lie: null });
                        }}
                        style={{ '--accent-color': accentColor }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {champ.type_champ === 'yesno' && (
              <div className="nested-branching-container grid-full-width" style={{ marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  
                  {/* Branche OUI */}
                  <div className="branch-block branch-oui" style={{ borderLeft: '3px solid #10b981', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeftWidth: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }}></div>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Si la réponse est "Oui"</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-add" 
                        style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: '#fff', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                        onClick={() => onAddChildField(champ.nom_champ, 'oui')}
                      >
                        <Plus size={14} /> Ajouter
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {childrenOui.map((child, idx) => {
                        const childMainIdx = champs.indexOf(child);
                        return (
                          <FieldRow
                            key={child.id || child.client_id || child.nom_champ}
                            champ={child}
                            index={childMainIdx}
                            champs={champs}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            isFirst={idx === 0}
                            isLast={idx === childrenOui.length - 1}
                            accentColor="#10b981"
                            activityMotifs={activityMotifs}
                            isChild={true}
                            onMoveChildField={onMoveChildField}
                          />
                        );
                      })}
                      {childrenOui.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Aucun champ pour la réponse Oui</div>
                      )}
                    </div>
                  </div>

                  {/* NON Branch */}
                  <div className="branch-block branch-non" style={{ borderLeft: '3px solid #ef4444', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeftWidth: '3px', borderLeftColor: '#ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }}></div>
                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Si la réponse est "Non"</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-add" 
                        style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                        onClick={() => onAddChildField(champ.nom_champ, 'non')}
                      >
                        <Plus size={14} /> Ajouter
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {childrenNon.map((child, idx) => {
                        const childMainIdx = champs.indexOf(child);
                        return (
                          <FieldRow
                            key={child.id || child.client_id || child.nom_champ}
                            champ={child}
                            index={childMainIdx}
                            champs={champs}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            isFirst={idx === 0}
                            isLast={idx === childrenNon.length - 1}
                            accentColor="#ef4444"
                            activityMotifs={activityMotifs}
                            isChild={true}
                            onMoveChildField={onMoveChildField}
                          />
                        );
                      })}
                      {childrenNon.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Aucun champ pour la réponse Non</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormDesigner({ activityId, activityNom, activityMotifs = [], accentColor = '#10b981', onClose }) {
  const [champs, setChamps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewData, setPreviewData] = useState({});

  const [selectedSectionNom, setSelectedSectionNom] = useState(null);
  const [expandedSectionNom, setExpandedSectionNom] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.85);

  useEffect(() => {
    const updateScale = () => {
      const availableHeight = window.innerHeight - 200;
      let newScale = availableHeight / 720;
      if (newScale > 0.85) newScale = 0.85;
      if (newScale < 0.4) newScale = 0.4;
      setPreviewScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.preview-phone-header-drag')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y
      });
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Group fields by section helper
  const getSectionsAndFields = (champsList) => {
    const sectionsList = [];
    let currentSection = {
      isDefault: true,
      nom_champ: '_default_',
      label: 'Champs généraux',
      sectionField: null,
      fields: []
    };

    champsList.forEach(c => {
      if (c.type_champ === 'section') {
        if (currentSection.fields.length > 0 || !currentSection.isDefault) {
          sectionsList.push(currentSection);
        }
        currentSection = {
          isDefault: false,
          nom_champ: c.nom_champ,
          label: c.label || 'Titre de la section',
          sectionField: c,
          fields: []
        };
      } else {
        if (!isChildField(c, champsList)) {
          currentSection.fields.push(c);
        }
      }
    });

    sectionsList.push(currentSection);
    return sectionsList.filter(s => s.fields.length > 0 || !s.isDefault);
  };

  // Rebuild flat array of champs from grouped sections
  const rebuildFlatChamps = (sectionsList, allChamps) => {
    const flat = [];
    
    const pushFieldAndChildren = (field) => {
      flat.push(field);
      const children = allChamps.filter(c => c.conditions && c.conditions.field === field.nom_champ);
      children.forEach(child => {
        pushFieldAndChildren(child);
      });
    };

    sectionsList.forEach(sec => {
      if (sec.sectionField) {
        flat.push(sec.sectionField);
      }
      sec.fields.forEach(field => {
        pushFieldAndChildren(field);
      });
    });

    return flat;
  };

  useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    apiFetch(`/champs-dynamiques?activiteId=${activityId}&t=${Date.now()}`)
      .then(res => {
        if (res.status === 'success') {
          const parsed = (res.data.champs || []).map(c => {
            let conditions = c.conditions;
            if (typeof conditions === 'string') {
              try { conditions = JSON.parse(conditions); } catch (e) { conditions = null; }
            }
            return { ...c, conditions };
          });
          setChamps(parsed);
          
          // Auto-select first section
          const parsedSections = getSectionsAndFields(parsed);
          if (parsedSections.length > 0) {
            setSelectedSectionNom(parsedSections[0].nom_champ);
          } else {
            setSelectedSectionNom('_default_');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activityId]);

  const addField = (type = 'text') => {
    setChamps(prev => {
      const newNom = generateUniqueFieldName(prev);
      const newField = {
        client_id: Math.random().toString(36).substring(2, 9),
        id: null,
        activite_id: activityId,
        nom_champ: newNom,
        label: type === 'section' ? 'Nouvelle Section' : '',
        type_champ: type,
        obligatoire: type !== 'section',
        options: [],
        ordre: prev.length,
        placeholder: '',
        _new: true,
      };
      
      const nextChamps = [...prev, newField];
      if (type === 'section') {
        setExpandedSectionNom(newNom);
        setSelectedSectionNom(newNom);
      }
      return nextChamps;
    });
  };

  const addFieldToSection = (sectionNomChamp, fieldType = 'text') => {
    setChamps(prev => {
      const newNomChamp = generateUniqueFieldName(prev);
      const newField = {
        client_id: Math.random().toString(36).substring(2, 9),
        id: null,
        activite_id: activityId,
        nom_champ: newNomChamp,
        label: '',
        type_champ: fieldType,
        obligatoire: fieldType !== 'section',
        options: [],
        ordre: prev.length,
        placeholder: '',
        _new: true,
      };

      const sectionsList = getSectionsAndFields(prev);
      
      // If we don't have any sections yet and want to add a field, or if default section is targeted
      if (sectionsList.length === 0 || (sectionsList.length === 1 && sectionsList[0].isDefault && sectionNomChamp !== '_default_')) {
        return [...prev, newField];
      }

      const sec = sectionsList.find(s => s.nom_champ === sectionNomChamp);
      if (sec) {
        sec.fields.push(newField);
      } else {
        sectionsList[0].fields.push(newField);
      }
      return rebuildFlatChamps(sectionsList, prev);
    });
  };

  const getParentSectionNom = (champ) => {
    const idx = champs.indexOf(champ);
    if (idx === -1) return '_default_';
    for (let i = idx - 1; i >= 0; i--) {
      if (champs[i].type_champ === 'section') {
        return champs[i].nom_champ;
      }
    }
    return '_default_';
  };

  const moveFieldToSection = (champNomChamp, targetSectionNom) => {
    setChamps(prev => {
      const sectionsList = getSectionsAndFields(prev);
      
      let fieldToMove = null;
      sectionsList.forEach(sec => {
        const fIdx = sec.fields.findIndex(f => f.nom_champ === champNomChamp);
        if (fIdx !== -1) {
          fieldToMove = sec.fields[fIdx];
          sec.fields.splice(fIdx, 1);
        }
      });
      
      if (!fieldToMove) return prev;
      
      const targetSec = sectionsList.find(s => s.nom_champ === targetSectionNom);
      if (targetSec) {
        targetSec.fields.push(fieldToMove);
      } else {
        const defaultSec = sectionsList.find(s => s.isDefault);
        if (defaultSec) {
          defaultSec.fields.push(fieldToMove);
        } else {
          sectionsList[0].fields.push(fieldToMove);
        }
      }
      
      return rebuildFlatChamps(sectionsList, prev);
    });
  };

  const moveSection = (sectionNomChamp, direction) => {
    setChamps(prev => {
      const sectionsList = getSectionsAndFields(prev);
      const sIdx = sectionsList.findIndex(s => s.nom_champ === sectionNomChamp);
      if (sIdx === -1) return prev;

      if (direction === 'up' && sIdx > 0) {
        const temp = sectionsList[sIdx];
        sectionsList[sIdx] = sectionsList[sIdx - 1];
        sectionsList[sIdx - 1] = temp;
        return rebuildFlatChamps(sectionsList, prev);
      } else if (direction === 'down' && sIdx < sectionsList.length - 1) {
        const temp = sectionsList[sIdx];
        sectionsList[sIdx] = sectionsList[sIdx + 1];
        sectionsList[sIdx + 1] = temp;
        return rebuildFlatChamps(sectionsList, prev);
      }
      return prev;
    });
  };

  const handleFieldDragEnd = (event, section) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setChamps(prev => {
      const sectionsList = getSectionsAndFields(prev);
      const sec = sectionsList.find(s => s.nom_champ === section.nom_champ);
      if (!sec) return prev;
      
      const oldIndex = sec.fields.findIndex(f => (f.id || f.client_id || f.nom_champ) === active.id);
      const newIndex = sec.fields.findIndex(f => (f.id || f.client_id || f.nom_champ) === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      sec.fields = arrayMove(sec.fields, oldIndex, newIndex);
      return rebuildFlatChamps(sectionsList, prev);
    });
  };

  const addChildField = (parentNomChamp, val) => {
    setChamps(prev => {
      const parentIdx = prev.findIndex(c => c.nom_champ === parentNomChamp);
      if (parentIdx === -1) return prev;
      
      let insertIdx = parentIdx + 1;
      while (insertIdx < prev.length && prev[insertIdx].conditions && prev[insertIdx].conditions.field === parentNomChamp) {
        insertIdx++;
      }
      
      const newField = {
        client_id: Math.random().toString(36).substring(2, 9),
        id: null,
        activite_id: activityId,
        nom_champ: generateUniqueFieldName(prev),
        label: '',
        type_champ: 'text',
        obligatoire: true,
        options: [],
        ordre: prev.length,
        placeholder: '',
        conditions: { field: parentNomChamp, value: val },
        _new: true,
      };
      
      const newChamps = [...prev];
      newChamps.splice(insertIdx, 0, newField);
      return newChamps;
    });
  };

  const moveChildField = (childNomChamp, direction) => {
    setChamps(prev => {
      const childIdx = prev.findIndex(c => c.nom_champ === childNomChamp);
      if (childIdx === -1) return prev;
      
      const child = prev[childIdx];
      const parentField = child.conditions.field;
      const val = child.conditions.value;
      
      const siblings = prev.filter(c => c.conditions && c.conditions.field === parentField && c.conditions.value === val);
      const siblingIdx = siblings.findIndex(c => c.nom_champ === childNomChamp);
      
      if (direction === 'up' && siblingIdx > 0) {
        const targetSibling = siblings[siblingIdx - 1];
        const targetIdx = prev.findIndex(c => c.nom_champ === targetSibling.nom_champ);
        
        const newChamps = [...prev];
        newChamps[childIdx] = targetSibling;
        newChamps[targetIdx] = child;
        return newChamps;
      } else if (direction === 'down' && siblingIdx < siblings.length - 1) {
        const targetSibling = siblings[siblingIdx + 1];
        const targetIdx = prev.findIndex(c => c.nom_champ === targetSibling.nom_champ);
        
        const newChamps = [...prev];
        newChamps[childIdx] = targetSibling;
        newChamps[targetIdx] = child;
        return newChamps;
      }
      return prev;
    });
  };

  const updateField = (oldNomChamp, updated) => {
    setChamps(prev => {
      let newChamps = prev.map(c => c.nom_champ === oldNomChamp ? updated : c);
      
      if (updated.nom_champ && updated.nom_champ !== oldNomChamp) {
        newChamps = newChamps.map(c => {
          if (c.conditions && c.conditions.field === oldNomChamp) {
            return { ...c, conditions: { ...c.conditions, field: updated.nom_champ } };
          }
          return c;
        });
      }
      return newChamps;
    });

    if (updated.nom_champ && updated.nom_champ !== oldNomChamp) {
      setSelectedSectionNom(prev => prev === oldNomChamp ? updated.nom_champ : prev);
      setExpandedSectionNom(prev => prev === oldNomChamp ? updated.nom_champ : prev);
    }
  };

  const deleteField = async (nomChamp) => {
    setChamps(prev => {
      const fieldToDelete = prev.find(c => c.nom_champ === nomChamp);
      if (!fieldToDelete) return prev;

      const toDelete = [fieldToDelete];
      if (fieldToDelete.type_champ === 'yesno') {
        const children = prev.filter(c => c.conditions && c.conditions.field === nomChamp);
        toDelete.push(...children);
      }

      toDelete.forEach(c => {
        if (!c._new && c.id) {
          apiFetch(`/champs-dynamiques/${c.id}`, { method: 'DELETE' }).catch(console.error);
        }
      });

      const deleteNames = toDelete.map(c => c.nom_champ);
      const filtered = prev.filter(c => !deleteNames.includes(c.nom_champ));

      if (deleteNames.includes(selectedSectionNom)) {
        const parsedSecs = getSectionsAndFields(filtered);
        if (parsedSecs.length > 0) {
          setSelectedSectionNom(parsedSecs[0].nom_champ);
        } else {
          setSelectedSectionNom('_default_');
        }
      }
      if (deleteNames.includes(expandedSectionNom)) {
        setExpandedSectionNom(null);
      }

      return filtered;
    });
  };

  const saveAll = async () => {
    // Validate
    for (const c of champs) {
      if (!c.label?.trim()) {
        alert('Tous les champs doivent avoir un label.'); return;
      }
    }

    // Sort champs so children are grouped right after their parent
    const orderedChamps = [];
    const rootChamps = champs.filter(c => !isChildField(c, champs));
    for (const root of rootChamps) {
      orderedChamps.push(root);
      const children = champs.filter(c => c.conditions && c.conditions.field === root.nom_champ);
      orderedChamps.push(...children);
    }

    setSaving(true);
    try {
      for (let i = 0; i < orderedChamps.length; i++) {
        const c = { ...orderedChamps[i], ordre: i };
        if (c._new || !c.id) {
          // Create
          await apiFetch('/champs-dynamiques', {
            method: 'POST',
            bodyData: {
              activite_id: activityId,
              nom_champ: c.nom_champ,
              label: c.label,
              type_champ: c.type_champ,
              obligatoire: c.obligatoire,
              options: c.options || [],
              conditions: c.conditions || null,
              ordre: i,
              placeholder: c.placeholder || '',
            },
          });
        } else {
          // Update
          await apiFetch(`/champs-dynamiques/${c.id}`, {
            method: 'PUT',
            bodyData: {
              label: c.label,
              type_champ: c.type_champ,
              obligatoire: c.obligatoire,
              options: c.options || [],
              conditions: c.conditions || null,
              ordre: i,
              placeholder: c.placeholder || '',
            },
          });
        }
      }
      // Reload
      const res = await apiFetch(`/champs-dynamiques?activiteId=${activityId}&t=${Date.now()}`);
      if (res.status === 'success') {
        const parsed = (res.data.champs || []).map(c => {
          let conditions = c.conditions;
          if (typeof conditions === 'string') {
            try { conditions = JSON.parse(conditions); } catch (e) { conditions = null; }
          }
          return { ...c, conditions };
        });
        setChamps(parsed);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving fields:', err);
      alert('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-designer">
      {/* Header */}
      <div className="fd-header" style={{ borderBottom: `3px solid ${accentColor}` }}>
        <div className="fd-header-left">
          {onClose && (
            <button className="icon-btn" onClick={onClose}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="fd-title">
              <Settings size={18} color={accentColor} style={{ marginRight: 8 }} />
              Concepteur de formulaire
            </h2>
            <p className="fd-subtitle">Activité : <strong>{activityNom}</strong></p>
          </div>
        </div>
        <div className="fd-header-actions">
          <button
            className={`btn btn-outline ${preview ? 'active' : ''}`}
            onClick={() => setPreview(!preview)}
          >
            <Eye size={16} />
            {preview ? 'Masquer aperçu' : 'Aperçu'}
          </button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: accentColor }}
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? '…Sauvegarde' : saved ? <><Check size={16} /> Sauvegardé !</> : <><Save size={16} /> Sauvegarder</>}
          </button>
        </div>
      </div>

      <div className="fd-body">
        {/* Editor */}
        <div className="fd-editor fd-full" style={{ paddingRight: preview ? '390px' : '20px', transition: 'padding-right 0.3s' }}>
          <div className="fd-toolbar">
            <span className="fd-count">{champs.length} champ{champs.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-outline"
                style={{ borderColor: accentColor, color: accentColor }}
                onClick={() => addField('section')}
              >
                <Plus size={16} /> Ajouter une section
              </button>
              <button
                className="btn btn-add"
                style={{ backgroundColor: accentColor }}
                onClick={() => addFieldToSection(selectedSectionNom || '_default_', 'text')}
              >
                <Plus size={16} /> Ajouter un champ
              </button>
            </div>
          </div>

          {loading ? (
            <div className="fd-loading">
              <div className="spinner" style={{ borderTopColor: accentColor }} />
              <span>Chargement des champs...</span>
            </div>
          ) : champs.length === 0 ? (
            <div className="fd-empty">
              <List size={40} color="#cbd5e1" />
              <p>Aucun champ configuré.</p>
              <p>Cliquez sur "Ajouter une section" pour commencer.</p>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: accentColor }}
                onClick={() => addField('section')}
              >
                <Plus size={16} /> Première section
              </button>
            </div>
          ) : (
            <div className="fields-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '16px' }}>
              <div className="sections-sidebar" style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sections</div>
                {getSectionsAndFields(champs).map(sec => (
                   <button 
                     key={sec.nom_champ} 
                     onClick={() => setSelectedSectionNom(sec.nom_champ)}
                     style={{
                       padding: '12px 16px',
                       borderRadius: '8px',
                       background: selectedSectionNom === sec.nom_champ ? accentColor : '#fff',
                       color: selectedSectionNom === sec.nom_champ ? '#fff' : '#334155',
                       border: `1px solid ${selectedSectionNom === sec.nom_champ ? accentColor : '#e2e8f0'}`,
                       textAlign: 'left',
                       fontWeight: '600',
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       cursor: 'pointer',
                       boxShadow: selectedSectionNom === sec.nom_champ ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                     }}
                   >
                     <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>{sec.label}</span>
                     <span style={{ background: selectedSectionNom === sec.nom_champ ? 'rgba(255,255,255,0.2)' : '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{sec.fields.length}</span>
                   </button>
                ))}
              </div>
              <div className="fields-list" style={{ flex: 1 }}>
                {(() => {
                  const currentSec = getSectionsAndFields(champs).find(s => s.nom_champ === selectedSectionNom);
                  if (!currentSec) return null;
                  return (
                    <>
                      {currentSec.sectionField && (
                        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Propriétés de la section</div>
                          <FieldRow
                            key={currentSec.sectionField.id || currentSec.sectionField.client_id || currentSec.sectionField.nom_champ}
                            champ={currentSec.sectionField}
                            index={champs.indexOf(currentSec.sectionField)}
                            champs={champs}
                            onUpdate={updateField}
                            onDelete={(nom_champ) => {
                               deleteField(nom_champ);
                               setSelectedSectionNom('_default_');
                            }}
                            isFirst={false}
                            isLast={false}
                            accentColor={accentColor}
                            activityMotifs={activityMotifs}
                          />
                        </div>
                      )}
                      
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>Champs de la section</div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleFieldDragEnd(e, currentSec)}>
                        <SortableContext 
                          items={(currentSec.fields || []).filter(c => !isChildField(c, champs)).map(c => c.id || c.client_id || c.nom_champ)} 
                          strategy={rectSortingStrategy}
                        >
                          {(currentSec.fields || []).map((champ) => {
                            if (isChildField(champ, champs)) return null;
                            const mainIndex = champs.indexOf(champ);
                            return (
                              <FieldRow
                                key={champ.id || champ.client_id || champ.nom_champ}
                                champ={champ}
                                index={mainIndex}
                                champs={champs}
                                onUpdate={updateField}
                                onDelete={deleteField}
                                isFirst={false}
                                isLast={false}
                                accentColor={accentColor}
                                activityMotifs={activityMotifs}
                                onAddChildField={addChildField}
                                onMoveChildField={moveChildField}
                                sections={getSectionsAndFields(champs)}
                                getParentSectionNom={getParentSectionNom}
                                moveFieldToSection={moveFieldToSection}
                              />
                            );
                          })}
                          {(currentSec.fields || []).length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                              Aucun champ dans cette section. Cliquez sur "Ajouter un champ" en haut à droite.
                            </div>
                          )}
                        </SortableContext>
                      </DndContext>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div 
            className="fd-preview-floating"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="preview-phone-bezel" style={{ transform: `scale(${previewScale})` }}>
              {/* Realistic Side Buttons */}
              <div className="preview-phone-volume-up"></div>
              <div className="preview-phone-volume-down"></div>
              <div className="preview-phone-power"></div>

              {/* Top drag handle / speaker / dynamic island / status bar */}
              <div className="preview-phone-header-drag">
                <div className="preview-phone-speaker"></div>
                <div className="preview-phone-dynamic-island">
                  <div className="preview-phone-camera"></div>
                </div>
                <div className="preview-phone-status-bar">
                  <span className="phone-time">09:41</span>
                  <div className="phone-icons" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10 }}>📶</span>
                    <span style={{ fontSize: 10 }}>📶</span>
                    <span style={{ fontSize: 10 }}>🔋</span>
                  </div>
                </div>
                
                {/* Simulated Native App Bar */}
                <div className="preview-app-bar">
                  <div className="app-bar-back-btn">
                    <ArrowLeft size={15} color="#475569" />
                  </div>
                  <div className="app-bar-title-container">
                    <span className="app-bar-title">{activityNom}</span>
                    <span className="app-bar-subtitle">Nouvelle demande d'acte</span>
                  </div>
                  <div className="app-bar-grip">
                    <GripVertical size={14} color="#94a3b8" />
                  </div>
                </div>
              </div>
              
              <div className="preview-phone-screen">
                <div className="preview-body">
                  <div className="preview-section-label">TITULAIRE DE L'ACTE</div>
                  <div className="preview-radio-row">
                    <div className="preview-radio active" style={{ borderColor: accentColor, color: accentColor, background: `rgba(16, 185, 129, 0.05)` }}>
                      ● Moi-même
                    </div>
                    <div className="preview-radio">○ Autre personne</div>
                  </div>
                  {activityMotifs && activityMotifs.length > 0 && (
                    <div className="preview-field" style={{ marginBottom: 20 }}>
                      <label className="preview-label">Motif de la demande *</label>
                      <div className="preview-select" style={{ borderColor: '#e2e8f0', padding: 0 }}>
                        <select 
                          style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', outline: 'none', appearance: 'none' }}
                          value={previewData['_motif_'] || ''}
                          onChange={e => setPreviewData({...previewData, '_motif_': e.target.value})}
                        >
                          <option value="">Sélectionner un motif...</option>
                          {activityMotifs.map((m, i) => <option key={i} value={m}>{m}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: 14, pointerEvents: 'none', color: '#64748b' }}>▼</span>
                      </div>
                    </div>
                  )}
                  <div className="preview-section-label" style={{ marginTop: 16 }}>INFORMATIONS REQUISES</div>
                  {champs.filter(c => {
                    // 1. Filter by Motif if applicable
                    if (activityMotifs && activityMotifs.length > 0) {
                      const isSpecific = c.conditions && c.conditions.motifs && c.conditions.motifs.length > 0;
                      const legacyMotif = c.motif_lie;
                      if (isSpecific && !c.conditions.motifs.includes(previewData['_motif_'])) {
                        return false;
                      } else if (legacyMotif && legacyMotif !== previewData['_motif_']) {
                        return false;
                      }
                    }
                    
                    // 2. Filter by Parent yesno/select condition if applicable
                    if (c.conditions && c.conditions.field) {
                      const parentVal = previewData[c.conditions.field];
                      return parentVal === c.conditions.value;
                    }
                    
                    return true;
                  }).map((c, i) => {
                    const typeInfo = FIELD_TYPES.find(t => t.value === c.type_champ) || FIELD_TYPES[0];
                    return (
                      <div key={i} className="preview-field">
                        <label className="preview-label">
                          {c.label || '…'}{c.obligatoire ? ' *' : ''}
                        </label>
                        {c.type_champ === 'yesno' ? (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <div 
                              className={`preview-radio ${previewData[c.nom_champ] === 'oui' ? 'active' : ''}`}
                              style={{ 
                                flex: 1, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: previewData[c.nom_champ] === 'oui' ? `rgba(16, 185, 129, 0.05)` : '#fff',
                                borderColor: previewData[c.nom_champ] === 'oui' ? accentColor : '#e2e8f0',
                                color: previewData[c.nom_champ] === 'oui' ? accentColor : '#475569',
                                fontSize: '0.85rem',
                                fontWeight: 500
                              }}
                              onClick={() => {
                                // Set value and also clear nested children of this field if it is yesno
                                setPreviewData(prev => {
                                  const updated = { ...prev, [c.nom_champ]: 'oui' };
                                  // Find children of this field that are for 'non' and clear them
                                  champs.forEach(child => {
                                    if (child.conditions && child.conditions.field === c.nom_champ && child.conditions.value === 'non') {
                                      delete updated[child.nom_champ];
                                    }
                                  });
                                  return updated;
                                });
                              }}
                            >
                              <span style={{ fontSize: 10 }}>{previewData[c.nom_champ] === 'oui' ? '●' : '○'}</span> Oui
                            </div>
                            <div 
                              className={`preview-radio ${previewData[c.nom_champ] === 'non' ? 'active' : ''}`}
                              style={{ 
                                flex: 1, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: previewData[c.nom_champ] === 'non' ? `rgba(16, 185, 129, 0.05)` : '#fff',
                                borderColor: previewData[c.nom_champ] === 'non' ? accentColor : '#e2e8f0',
                                color: previewData[c.nom_champ] === 'non' ? accentColor : '#475569',
                                fontSize: '0.85rem',
                                fontWeight: 500
                              }}
                              onClick={() => {
                                setPreviewData(prev => {
                                  const updated = { ...prev, [c.nom_champ]: 'non' };
                                  champs.forEach(child => {
                                    if (child.conditions && child.conditions.field === c.nom_champ && child.conditions.value === 'oui') {
                                      delete updated[child.nom_champ];
                                    }
                                  });
                                  return updated;
                                });
                              }}
                            >
                              <span style={{ fontSize: 10 }}>{previewData[c.nom_champ] === 'non' ? '●' : '○'}</span> Non
                            </div>
                          </div>
                        ) : ['region', 'departement', 'commune', 'centre', 'sexe', 'select'].includes(c.type_champ) ? (
                          <div className="preview-select" style={{ borderColor: '#e2e8f0', padding: 0 }}>
                            <select 
                              style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', outline: 'none', appearance: 'none' }}
                              value={previewData[c.nom_champ] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setPreviewData(prev => {
                                  const updated = { ...prev, [c.nom_champ]: val };
                                  // Clear child fields whose condition is no longer met
                                  champs.forEach(child => {
                                    if (child.conditions && child.conditions.field === c.nom_champ && child.conditions.value !== val) {
                                      delete updated[child.nom_champ];
                                    }
                                  });
                                  return updated;
                                });
                              }}
                            >
                              <option value="">{c.placeholder || `Sélectionner…`}</option>
                              {(c.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <span style={{ position: 'absolute', right: 14, pointerEvents: 'none', color: '#64748b' }}>▼</span>
                          </div>
                        ) : c.type_champ === 'file' ? (
                          <div className="preview-select" style={{ borderColor: '#e2e8f0', borderStyle: 'dashed', backgroundColor: '#f8fafc', justifyContent: 'center', gap: 8, padding: '14px 20px', cursor: 'pointer' }}>
                            <Upload size={16} color={accentColor} />
                            <span style={{ color: accentColor, fontWeight: 700 }}>Téléverser un fichier</span>
                          </div>
                        ) : (
                          <div className="preview-input" style={{ padding: 0 }}>
                            <input 
                              type={c.type_champ === 'number' ? 'number' : 'text'}
                              style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', outline: 'none' }}
                              placeholder={c.placeholder || `Saisir : ${(c.label || '').toLowerCase()}`}
                              value={previewData[c.nom_champ] || ''}
                              onChange={e => setPreviewData({...previewData, [c.nom_champ]: e.target.value})}
                            />
                          </div>
                        )}
                        <span className="preview-type-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <FieldIcon iconName={typeInfo.iconName} size={10} />
                          {typeInfo.label}
                        </span>
                      </div>
                    );
                  })}
                  {champs.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                      Ajoutez des champs pour voir l'aperçu
                    </p>
                  )}
                  <button className="preview-cta" style={{ backgroundColor: accentColor }}>Continuer →</button>
                </div>
              </div>
              <div className="preview-phone-home-indicator" />
            </div>
          </div>
        )}
      </div>
      <style>{`
        .form-designer { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
        .fd-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px; background: #fff; gap: 16px;
        }
        .fd-header-left { display: flex; align-items: center; gap: 14px; }
        .fd-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; }
        .fd-subtitle { font-size: 13px; color: #64748b; margin: 2px 0 0; }
        .fd-header-actions { display: flex; gap: 10px; }
        .fd-body { display: flex; flex: 1; overflow: hidden; gap: 0; position: relative; }
        .fd-editor { display: flex; flex-direction: column; flex: 1; overflow-y: auto; padding: 20px; }
        .fd-half { flex: 0 0 55%; border-right: 1px solid #e2e8f0; }
        .fd-full { flex: 1; }
        
        /* Floating Draggable Phone Frame */
        .fd-preview-floating {
          position: absolute;
          top: 30px;
          right: 30px;
          z-index: 1500;
          cursor: default;
          pointer-events: auto;
          transition: transform 0.05s ease-out;
        }
        .preview-phone-bezel {
          width: 360px;
          height: 720px;
          background: #090d16;
          border-radius: 50px;
          padding: 12px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.4), 
                      0 0 0 4px #1f2937, 
                      0 0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 0 8px rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transform-origin: top right;
        }
        
        /* Realistic Side Buttons */
        .preview-phone-volume-up {
          position: absolute;
          left: -4px;
          top: 130px;
          width: 4px;
          height: 40px;
          background: #1f2937;
          border-top-left-radius: 3px;
          border-bottom-left-radius: 3px;
        }
        .preview-phone-volume-down {
          position: absolute;
          left: -4px;
          top: 180px;
          width: 4px;
          height: 40px;
          background: #1f2937;
          border-top-left-radius: 3px;
          border-bottom-left-radius: 3px;
        }
        .preview-phone-power {
          position: absolute;
          right: -4px;
          top: 150px;
          width: 4px;
          height: 60px;
          background: #1f2937;
          border-top-right-radius: 3px;
          border-bottom-right-radius: 3px;
        }
        
        .preview-phone-header-drag {
          background: #090d16;
          border-top-left-radius: 38px;
          border-top-right-radius: 38px;
          padding-top: 10px;
          cursor: grab;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 100;
        }
        .preview-phone-header-drag:active {
          cursor: grabbing;
        }
        
        .preview-phone-speaker {
          width: 50px;
          height: 4px;
          background: #27272a;
          border-radius: 2px;
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .preview-phone-dynamic-island {
          width: 100px;
          height: 25px;
          background: #000;
          border-radius: 15px;
          margin: 4px auto 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 15px;
          box-shadow: inset 0 0 4px rgba(255,255,255,0.1);
        }
        .preview-phone-camera {
          width: 7px;
          height: 7px;
          background: #18181b;
          border-radius: 50%;
          border: 1px solid #27272a;
        }
        
        .preview-phone-status-bar {
          height: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          user-select: none;
          margin-top: 4px;
        }
        
        .preview-app-bar {
          background: #fff;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .app-bar-back-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .app-bar-title-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .app-bar-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .app-bar-subtitle {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
        }
        .app-bar-grip {
          display: flex;
          align-items: center;
          color: #94a3b8;
        }
        
        .preview-phone-screen {
          flex: 1;
          background: #f8fafc;
          border-bottom-left-radius: 38px;
          border-bottom-right-radius: 38px;
          overflow-y: auto;
          position: relative;
          padding-bottom: 20px;
        }
        .preview-phone-screen::-webkit-scrollbar {
          width: 6px;
        }
        .preview-phone-screen::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 3px;
        }
        .preview-phone-home-indicator {
          width: 120px;
          height: 5px;
          background: #52525b;
          border-radius: 3px;
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        
        .preview-body { padding: 20px; }
        .preview-section-label {
          font-size: 10px; font-weight: 700; color: #94a3b8;
          letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px;
        }
        .preview-radio-row { display: flex; gap: 10px; margin-bottom: 8px; }
        .preview-radio {
          flex: 1; border: 2px solid #e2e8f0; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 600; color: #475569;
          background: #fff;
        }
        .preview-radio.active { background: rgba(16,185,129,0.08); }
        .preview-field { margin-bottom: 14px; position: relative; }
        .preview-label { display: block; font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 5px; }
        .preview-input, .preview-select {
          background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 11px 14px; font-size: 13px; color: #0f172a;
          display: flex; justify-content: space-between; align-items: center;
          position: relative;
        }
        .preview-type-tag {
          display: inline-block; font-size: 9px; color: #64748b;
          background: #f1f5f9; padding: 2px 8px; border-radius: 20px;
          margin-top: 4px;
        }
        .preview-cta {
          display: block; width: 100%; padding: 14px; border-radius: 14px;
          color: #fff; font-weight: 800; font-size: 15px; border: none;
          cursor: pointer; margin-top: 24px;
        }
        .fd-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .fd-count { font-size: 13px; font-weight: 600; color: #64748b; }
        .fd-loading, .fd-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; padding: 60px 20px;
          color: #94a3b8; text-align: center;
        }
        .spinner {
          width: 32px; height: 32px; border: 3px solid #e2e8f0;
          border-radius: 50%; border-top-color: #10b981;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Two-Column Grid for Field Cards */
        .fields-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding-bottom: 120px;
          align-items: start;
        }
        .field-row {
          background: #fff; border-radius: 16px; overflow: hidden;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.03), 0 2px 4px -2px rgb(0 0 0 / 0.02);
          border: 1.5px solid #e2e8f0;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .field-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03);
          border-color: #cbd5e1;
        }
        .field-row-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px; cursor: pointer; user-select: none;
          background: #fdfdfd;
          border-bottom: 1px solid #f1f5f9;
        }
        .field-row-section .field-row-header {
          background: #f1f5f9;
        }
        .field-row-section .field-label-preview {
          font-size: 16px; font-weight: 800; color: #334155;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .field-row-header:hover { background: #f8fafc; }
        .field-drag { display: flex; align-items: center; gap: 6px; color: #94a3b8; }
        .field-index { font-size: 11px; font-weight: 700; color: #94a3b8; }
        .field-type-badge {
          background: #f1f5f9; border-radius: 8px; padding: 4px 10px;
          font-size: 11px; font-weight: 700; color: #475569; white-space: nowrap;
        }
        .field-label-preview { flex: 1; font-size: 14px; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .required-badge {
          background: #fee2e2; color: #ef4444; border-radius: 6px;
          padding: 2px 8px; font-size: 10px; font-weight: 700;
        }
        .field-actions-inline { display: flex; align-items: center; gap: 6px; }
        .field-editor { padding: 18px; background: #fafbfc; display: flex; flex-direction: column; gap: 16px; border-top: 1.5px solid #f1f5f9; }
        
        /* 2-Column Grid inside the field editor */
        .editor-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.3px;
        }
        .form-group input, .form-group select, .options-editor textarea {
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          background: #fff;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .form-group input:focus, .form-group select:focus, .options-editor textarea:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 1px 2px rgba(0,0,0,0.02);
        }
        
        /* Select with Icon Wrapper */
        .select-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .select-with-icon select {
          width: 100%;
          padding-left: 38px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 16px;
        }
        .select-icon-wrapper {
          position: absolute;
          left: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        /* Toggle Card style for Required */
        .toggle-group {
          justify-content: space-between;
        }
        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          background: #fff;
          cursor: pointer;
          user-select: none;
          height: 42.5px;
          transition: all 0.2s;
        }
        .toggle-card:hover {
          border-color: #cbd5e1;
        }
        .toggle-card-label {
          font-size: 12.5px;
          color: #475569;
          font-weight: 600;
        }
        .switch-btn {
          width: 38px;
          height: 20px;
          background: #cbd5e1;
          border-radius: 20px;
          position: relative;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          padding: 2px;
        }
        .switch-btn.active {
          background: #10b981;
        }
        .switch-dot {
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .switch-btn.active .switch-dot {
          transform: translateX(18px);
        }

        /* Motifs Chips */
        .motifs-selector-section {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-subtitle {
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
        }
        .motifs-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .motif-chip {
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .motif-chip:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .motif-chip.active {
          border-color: var(--accent-color, #10b981);
          background: rgba(16, 185, 129, 0.08);
          color: var(--accent-color, #10b981);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
        }
        .grid-full-width {
          grid-column: span 2;
        }
        .options-editor textarea {
          width: 100%;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }
        
        .icon-btn {
          width: 28px; height: 28px; border: 1.5px solid #e2e8f0; border-radius: 8px;
          background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #475569; transition: all 0.2s;
        }
        .icon-btn:hover { border-color: #10b981; color: #10b981; }
        .icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
        .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 10px; font-size: 13px;
          font-weight: 700; cursor: pointer; border: none; transition: all 0.2s;
        }
        .btn-primary { color: #fff; box-shadow: 0 3px 10px rgba(16,185,129,0.3); }
        .btn-primary:hover { filter: brightness(0.92); }
        .btn-outline { background: #fff; border: 1.5px solid #e2e8f0; color: #475569; }
        .btn-outline:hover, .btn-outline.active { border-color: #10b981; color: #10b981; background: #f0fdf4; }
        .btn-add { color: #fff; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
