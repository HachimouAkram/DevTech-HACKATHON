import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Settings2 } from 'lucide-react';
import MobilePreview from './MobilePreview';

// --- Sortable Field Item Component ---
const SortableFieldItem = ({ id, field, onDelete, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 group">
      <div {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600">
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">{field.label}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{field.type_champ}</span>
          {field.obligatoire && <span className="text-xs text-red-500 font-bold">*</span>}
        </div>
        <div className="text-xs text-gray-500 mt-1">Nom tech: {field.nom_champ}</div>
        {field.conditions && field.conditions.field && (
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span>👁️ Affiché si {field.conditions.field} = {field.conditions.value}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(field)} className="p-2 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
          <Settings2 size={18} />
        </button>
        <button onClick={() => onDelete(id)} className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Main FormBuilder Component ---
const FormBuilder = ({ initialFields = [], onSave }) => {
  const [fields, setFields] = useState(initialFields.map((f, i) => ({ ...f, id: f.id || `field-${i}` })));
  const [editingField, setEditingField] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      nom_champ: `champ_${fields.length + 1}`,
      label: 'Nouveau Champ',
      type_champ: 'text',
      obligatoire: false,
      options: [],
      conditions: null
    };
    setFields([...fields, newField]);
    setEditingField(newField);
  };

  const handleDeleteField = (id) => {
    setFields(fields.filter(f => f.id !== id));
    if (editingField?.id === id) setEditingField(null);
  };

  const handleUpdateField = (updatedField) => {
    setFields(fields.map(f => f.id === updatedField.id ? updatedField : f));
  };

  const handleSaveAll = () => {
    // Nettoyer les IDs temporaires et passer à l'API
    const cleanFields = fields.map((f, index) => {
      const { id, ...rest } = f;
      return { ...rest, ordre: index };
    });
    if (onSave) onSave(cleanFields);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">
      {/* LEFT PANE: Editor */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white shadow-lg z-10">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Éditeur de Formulaire</h2>
          <div className="flex gap-2">
            <button onClick={handleAddField} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md font-medium hover:bg-blue-100 transition-colors">
              <Plus size={18} /> Ajouter Champ
            </button>
            <button onClick={handleSaveAll} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">
              Enregistrer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields} strategy={verticalListSortingStrategy}>
              {fields.map(field => (
                <SortableFieldItem 
                  key={field.id} 
                  id={field.id} 
                  field={field} 
                  onDelete={handleDeleteField} 
                  onEdit={() => setEditingField(field)} 
                />
              ))}
            </SortableContext>
          </DndContext>
          {fields.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-xl bg-white">
              <p className="text-gray-500 mb-4">Aucun champ dans ce formulaire.</p>
              <button onClick={handleAddField} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 shadow-sm">
                Créer le premier champ
              </button>
            </div>
          )}
        </div>

        {/* Edit Panel (Bottom Half or Modal equivalent) */}
        {editingField && (
          <div className="h-2/5 border-t border-gray-200 bg-white p-6 overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Paramètres du champ</h3>
              <button onClick={() => setEditingField(null)} className="text-sm text-gray-500 hover:text-gray-800">Fermer</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Label public</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                  value={editingField.label} 
                  onChange={e => handleUpdateField({...editingField, label: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nom technique (nom_champ)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                  value={editingField.nom_champ} 
                  onChange={e => handleUpdateField({...editingField, nom_champ: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type de champ</label>
                <select 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={editingField.type_champ}
                  onChange={e => handleUpdateField({...editingField, type_champ: e.target.value})}
                >
                  <option value="text">Texte court</option>
                  <option value="textarea">Texte long</option>
                  <option value="number">Nombre</option>
                  <option value="select">Liste déroulante (Menu)</option>
                  <option value="date">Date</option>
                </select>
              </div>
              
              <div className="flex items-center pt-6">
                <input 
                  type="checkbox" 
                  id="oblig" 
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                  checked={editingField.obligatoire}
                  onChange={e => handleUpdateField({...editingField, obligatoire: e.target.checked})}
                />
                <label htmlFor="oblig" className="text-sm text-gray-700">Champ obligatoire</label>
              </div>
            </div>

            {editingField.type_champ === 'select' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Options du menu déroulant</label>
                <textarea 
                  className="w-full border border-gray-300 rounded p-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder='[{"value":"perte", "label":"Perte"}, {"value":"vol", "label":"Vol"}]'
                  value={editingField.options ? JSON.stringify(editingField.options) : ''}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleUpdateField({...editingField, options: parsed});
                    } catch (err) {
                      // Silently fail parsing while typing
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Format JSON attendu.</p>
              </div>
            )}

            {/* Condition Logic Block */}
            <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <input 
                  type="checkbox" 
                  id="hasCondition" 
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                  checked={!!editingField.conditions}
                  onChange={e => {
                    if (e.target.checked) {
                      handleUpdateField({...editingField, conditions: { field: '', operator: 'equals', value: '' }});
                    } else {
                      handleUpdateField({...editingField, conditions: null});
                    }
                  }}
                />
                <label htmlFor="hasCondition" className="text-sm font-semibold text-blue-800">Afficher ce champ sous condition</label>
              </div>

              {editingField.conditions && (
                <div className="flex gap-2 items-center mt-2 pl-6">
                  <span className="text-sm text-gray-600">Si</span>
                  <select 
                    className="border border-gray-300 rounded p-1.5 text-sm w-1/3"
                    value={editingField.conditions.field}
                    onChange={e => handleUpdateField({
                      ...editingField, 
                      conditions: { ...editingField.conditions, field: e.target.value }
                    })}
                  >
                    <option value="">Sélectionner un champ</option>
                    {fields.filter(f => f.id !== editingField.id).map(f => (
                      <option key={f.id} value={f.nom_champ}>{f.label} ({f.nom_champ})</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600">est égal à</span>
                  <input 
                    type="text" 
                    placeholder="Valeur"
                    className="border border-gray-300 rounded p-1.5 text-sm w-1/3"
                    value={editingField.conditions.value}
                    onChange={e => handleUpdateField({
                      ...editingField, 
                      conditions: { ...editingField.conditions, value: e.target.value }
                    })}
                  />
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* RIGHT PANE: Live Mobile Preview */}
      <div className="w-1/2 flex flex-col">
        <MobilePreview fields={fields} />
      </div>
    </div>
  );
};

export default FormBuilder;
