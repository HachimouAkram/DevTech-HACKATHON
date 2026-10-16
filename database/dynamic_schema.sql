-- ============================================================
-- MIGRATION : Plateforme Multi-Bureaux & Formulaires Dynamiques
-- ============================================================

-- 1. Table BUREAUX (groupes de services administratifs)
CREATE TABLE IF NOT EXISTS bureaux (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(150) NOT NULL,
    description TEXT,
    code        VARCHAR(20)  UNIQUE NOT NULL,
    icone       VARCHAR(50)  DEFAULT 'Building2',
    couleur     VARCHAR(20)  DEFAULT '#10b981',
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    ordre       INTEGER      DEFAULT 0,
    config      JSONB
);

-- 2. Lier services à bureaux (nullable pour compatibilité)
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS bureau_id INTEGER REFERENCES bureaux(id) ON DELETE SET NULL;

-- 3. Table CHAMPS_DYNAMIQUES (formulaire no-code par activité)
CREATE TABLE IF NOT EXISTS champs_dynamiques (
    id          SERIAL PRIMARY KEY,
    activite_id INTEGER NOT NULL REFERENCES activites(id) ON DELETE CASCADE,
    nom_champ   VARCHAR(100) NOT NULL,
    label       VARCHAR(200) NOT NULL,
    type_champ  VARCHAR(30)  NOT NULL DEFAULT 'text',
    -- types: text, number, date, select, phone, textarea, region, departement, commune, centre, sexe
    obligatoire BOOLEAN      NOT NULL DEFAULT TRUE,
    options     JSONB,         -- Pour les champs de type 'select' : [{"value":"M","label":"Masculin"}]
    ordre       INTEGER      NOT NULL DEFAULT 0,
    placeholder VARCHAR(200),
    actif       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 4. Table CONFIG_GLOBALE (paramètres de la plateforme)
CREATE TABLE IF NOT EXISTS config_globale (
    id          SERIAL PRIMARY KEY,
    cle         VARCHAR(100) UNIQUE NOT NULL,
    valeur      TEXT,
    description TEXT
);

-- 5. Seed : Bureau "État Civil" par défaut
INSERT INTO bureaux (nom, description, code, icone, couleur, actif, ordre) VALUES
('État Civil',      'Gestion des actes de naissance, mariage et décès',            'ETAT_CIVIL',   'FileText',    '#10b981', TRUE, 1),
('Urbanisme',       'Permis de construire, certificats d''urbanisme',               'URBANISME',    'Building2',   '#3b82f6', TRUE, 2),
('Nettoyage',       'Gestion de la salubrité et du nettoyage urbain',              'NETTOYAGE',    'Trash2',      '#f59e0b', TRUE, 3),
('Finances',        'Gestion des taxes locales et recettes municipales',            'FINANCES',     'DollarSign',  '#8b5cf6', TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- 6. Rattacher le service "État Civil" au bureau "État Civil"
UPDATE services
SET bureau_id = (SELECT id FROM bureaux WHERE code = 'ETAT_CIVIL')
WHERE nom = 'État Civil' AND bureau_id IS NULL;

-- 7. Rattacher le service "Nettoyage" au bureau "Nettoyage"
UPDATE services
SET bureau_id = (SELECT id FROM bureaux WHERE code = 'NETTOYAGE')
WHERE nom = 'Département du Nettoyage' AND bureau_id IS NULL;

-- 8. Seed des champs dynamiques pour "Acte de naissance"
INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'region',           'Région',                      'region',   TRUE,  1, 'Sélectionner une région'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'departement',      'Département',                 'departement', TRUE, 2, 'Sélectionner un département'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'commune',          'Commune',                     'commune',  TRUE,  3, 'Sélectionner une commune'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'centre',           'Centre d''état civil',        'centre',   TRUE,  4, 'Sélectionner votre centre'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'sexe',             'Sexe',                        'sexe',     TRUE,  5, NULL
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'prenom',           'Prénom',                      'text',     TRUE,  6, 'Ex: Mamadou'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'nom_famille',      'Nom de famille',              'text',     TRUE,  7, 'Ex: Diallo'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'date_naissance',   'Date de naissance',           'date',     TRUE,  8, 'JJ/MM/AAAA'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'lieu_naissance',   'Lieu de naissance',           'text',     TRUE,  9, 'Ex: Dakar'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'prenom_pere',      'Prénom du père',              'text',     TRUE,  10, 'Ex: Ibrahima'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'prenom_mere',      'Prénom de la mère',           'text',     TRUE,  11, 'Ex: Mariama'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'nom_famille_mere', 'Nom de famille de la mère',   'text',     TRUE,  12, 'Ex: Seydi'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'annee_declaration','Année de déclaration',         'number',   TRUE,  13, 'Ex: 2020'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'numero_acte',      'Numéro d''acte',              'text',     TRUE,  14, 'Ex: ACT-12345'
FROM activites a WHERE a.nom = 'Acte de naissance'
ON CONFLICT DO NOTHING;

-- 9. Seed des champs dynamiques pour "Acte de mariage"
INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'region',           'Région',                      'region',   TRUE,  1, 'Sélectionner une région'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'departement',      'Département',                 'departement', TRUE, 2, NULL
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'commune',          'Commune',                     'commune',  TRUE,  3, NULL
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'centre',           'Centre d''état civil',        'centre',   TRUE,  4, NULL
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'prenom_epoux',     'Prénom Époux',                'text',     TRUE,  5, 'Ex: Mamadou'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'nom_epoux',        'Nom Époux',                   'text',     TRUE,  6, 'Ex: Diallo'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'cni_epoux',        'CNI Époux',                   'text',     TRUE,  7, '1XXXXXXXXXX'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'prenom_epouse',    'Prénom Épouse',               'text',     TRUE,  8, 'Ex: Fatou'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'nom_epouse',       'Nom Épouse',                  'text',     TRUE,  9, 'Ex: Seydi'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'cni_epouse',       'CNI Épouse',                  'text',     TRUE,  10, '2XXXXXXXXXX'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'date_mariage',     'Date du mariage',             'date',     TRUE,  11, 'JJ/MM/AAAA'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'lieu_mariage',     'Lieu du mariage',             'text',     TRUE,  12, 'Ex: Dakar Plateau'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

INSERT INTO champs_dynamiques (activite_id, nom_champ, label, type_champ, obligatoire, ordre, placeholder)
SELECT a.id, 'numero_registre',  'Numéro de registre',          'text',     TRUE,  13, 'Ex: REG-2023-001'
FROM activites a WHERE a.nom = 'Acte de mariage'
ON CONFLICT DO NOTHING;

-- 10. Config globale
INSERT INTO config_globale (cle, valeur, description) VALUES
('app_nom',     'Téranga Civil',        'Nom de l''application'),
('app_version', '2.0.0',               'Version de la plateforme'),
('multi_bureau', 'true',               'Activer la gestion multi-bureaux')
ON CONFLICT (cle) DO NOTHING;
