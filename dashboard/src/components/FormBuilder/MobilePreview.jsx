import React, { useState } from 'react';

const MobilePreview = ({ fields, activityMotifs = [] }) => {
  const [formData, setFormData] = useState({});

  // Check if a field should be displayed based on conditions
  const isFieldVisible = (field) => {
    if (activityMotifs && activityMotifs.length > 0) {
      const isSpecific = field.conditions && field.conditions.motifs && field.conditions.motifs.length > 0;
      const legacyMotif = field.motif_lie;
      if (isSpecific) {
        return field.conditions.motifs.includes(formData['_motif_']);
      } else if (legacyMotif) {
        return legacyMotif === formData['_motif_'];
      }
    }
    return true;
  };

  const handleInputChange = (nomChamp, value) => {
    setFormData(prev => ({ ...prev, [nomChamp]: value }));
  };

  return (
    <div className="flex justify-center items-center p-4 bg-gray-50 h-full">
      {/* Phone Frame */}
      <div className="relative w-[320px] h-[650px] bg-white rounded-[40px] shadow-2xl border-[8px] border-gray-900 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl w-40 mx-auto z-10"></div>
        
        {/* Content */}
        <div className="w-full h-full overflow-y-auto pt-10 pb-6 px-4 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Formulaire</h2>
          
          <div className="space-y-4">
            {activityMotifs && activityMotifs.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 mb-4">
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Motif de la demande <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full border border-blue-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                  onChange={(e) => handleInputChange('_motif_', e.target.value)}
                  value={formData['_motif_'] || ''}
                >
                  <option value="">Sélectionnez un motif</option>
                  {activityMotifs.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
            {fields.filter(isFieldVisible).map((field) => (
              <div key={field.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.obligatoire && <span className="text-red-500">*</span>}
                </label>
                
                {field.type_champ === 'select' ? (
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => handleInputChange(field.nom_champ, e.target.value)}
                    value={formData[field.nom_champ] || ''}
                  >
                    <option value="">Sélectionnez une option</option>
                    {field.options && field.options.map((opt, idx) => (
                      <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type={field.type_champ === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => handleInputChange(field.nom_champ, e.target.value)}
                    value={formData[field.nom_champ] || ''}
                  />
                )}
                
                {((field.conditions && field.conditions.motifs && field.conditions.motifs.length > 0) || field.motif_lie) && (
                  <p className="mt-2 text-xs text-blue-600 bg-blue-50 p-1 rounded inline-block">
                    Condition: Affiché car Motif ∈ [{(field.conditions?.motifs || [field.motif_lie]).join(', ')}]
                  </p>
                )}
              </div>
            ))}
            
            {fields.length > 0 && (
              <button className="w-full bg-blue-600 text-white font-medium py-3 rounded-md mt-6 shadow-sm">
                Soumettre
              </button>
            )}
            
            {fields.length === 0 && (
              <p className="text-center text-gray-400 mt-10 text-sm">Ajoutez des champs pour voir l'aperçu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
