-- ============================================================
-- SEEDS — Catalogue global de référence
-- (données créées par le Super Admin, partagées par toutes les communes)
-- ============================================================

-- Insertion des Régions
INSERT INTO regions (nom, code) VALUES
('Dakar', 'DK'),
('Thiès', 'TH'),
('Diourbel', 'DB'),
('Saint-Louis', 'SL'),
('Kaolack', 'KL'),
('Ziguinchor', 'ZC')
ON CONFLICT (code) DO NOTHING;

-- Insertion des Départements (Dakar & Thiès)
INSERT INTO departements (region_id, nom, code) VALUES
((SELECT id FROM regions WHERE code = 'DK'), 'Dakar', 'DK-DK'),
((SELECT id FROM regions WHERE code = 'DK'), 'Pikine', 'DK-PK'),
((SELECT id FROM regions WHERE code = 'DK'), 'Rufisque', 'DK-RF'),
((SELECT id FROM regions WHERE code = 'TH'), 'Thiès', 'TH-TH'),
((SELECT id FROM regions WHERE code = 'TH'), 'Mbour', 'TH-MB')
ON CONFLICT (code) DO NOTHING;

-- Insertion des Communes
INSERT INTO communes (departement_id, nom, code) VALUES
((SELECT id FROM departements WHERE code = 'DK-DK'), 'Dakar Plateau', 'DK-DK-PL'),
((SELECT id FROM departements WHERE code = 'DK-DK'), 'Médina', 'DK-DK-MD'),
((SELECT id FROM departements WHERE code = 'DK-DK'), 'Grand Yoff', 'DK-DK-GY'),
((SELECT id FROM departements WHERE code = 'DK-RF'), 'Rufisque Est', 'DK-RF-EST'),
((SELECT id FROM departements WHERE code = 'TH-TH'), 'Thiès Est', 'TH-TH-EST'),
((SELECT id FROM departements WHERE code = 'TH-MB'), 'Mbour Ville', 'TH-MB-VL')
ON CONFLICT (code) DO NOTHING;

-- Insertion des Centres d'État Civil
INSERT INTO centres (commune_id, nom, code) VALUES
((SELECT id FROM communes WHERE code = 'DK-DK-PL'), 'Centre Principal de Dakar Plateau', 'C-DK-PL-P'),
((SELECT id FROM communes WHERE code = 'DK-DK-MD'), 'Centre Secondaire de la Médina', 'C-DK-MD-S'),
((SELECT id FROM communes WHERE code = 'DK-DK-GY'), 'Centre de Grand Yoff', 'C-DK-GY'),
((SELECT id FROM communes WHERE code = 'DK-RF-EST'), 'Centre de Rufisque Est', 'C-DK-RF-E')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- CATALOGUE GLOBAL DES BUREAUX (Super Admin)
-- ============================================================
INSERT INTO bureaux (nom, description, code, icone, couleur, actif, ordre) VALUES
('État Civil',      'Gestion des actes de naissance, mariage et décès',        'ETAT_CIVIL',   'FileText',    '#10b981', TRUE, 1),
('Urbanisme',       'Permis de construire, certificats d''urbanisme',           'URBANISME',    'Building2',   '#3b82f6', TRUE, 2),
('Nettoyage',       'Gestion de la salubrité et du nettoyage urbain',          'NETTOYAGE',    'Trash2',      '#f59e0b', TRUE, 3),
('Finances',        'Gestion des taxes locales et recettes municipales',        'FINANCES',     'DollarSign',  '#8b5cf6', TRUE, 4),
('Affaires Sociales','Aide sociale, logement, services aux citoyens vulnérables','SOCIAL',      'Heart',       '#ec4899', TRUE, 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- CATALOGUE GLOBAL DES SERVICES (liés aux bureaux)
-- ============================================================
INSERT INTO services (bureau_id, nom, description, icone, actif) VALUES
-- Bureau État Civil
((SELECT id FROM bureaux WHERE code = 'ETAT_CIVIL'), 'Naissance',  'Service des actes de naissance et jugements supplétifs',  'Baby',      TRUE),
((SELECT id FROM bureaux WHERE code = 'ETAT_CIVIL'), 'Mariage',    'Service des actes de mariage et célébrations civiles',    'Heart',     TRUE),
((SELECT id FROM bureaux WHERE code = 'ETAT_CIVIL'), 'Décès',      'Service des actes de décès et déclarations de décès',     'FileX',     TRUE),
-- Bureau Urbanisme
((SELECT id FROM bureaux WHERE code = 'URBANISME'),  'Permis de Construire', 'Instruction et délivrance des permis de construire', 'Building', TRUE),
((SELECT id FROM bureaux WHERE code = 'URBANISME'),  'Certificats d''Urbanisme', 'Délivrance des certificats d''urbanisme', 'FileCheck', TRUE),
-- Bureau Nettoyage
((SELECT id FROM bureaux WHERE code = 'NETTOYAGE'),  'Collecte des Déchets', 'Gestion des tournées de collecte des ordures', 'Trash2', TRUE),
-- Bureau Finances
((SELECT id FROM bureaux WHERE code = 'FINANCES'),   'Taxes Locales', 'Gestion et recouvrement des taxes communales', 'DollarSign', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CATALOGUE GLOBAL DES ACTIVITÉS (liées aux services globaux)
-- ============================================================

-- Service Naissance
INSERT INTO activites (service_id, nom, prix, delai_min_jours, delai_max_jours, actif) VALUES
((SELECT id FROM services WHERE nom = 'Naissance'), 'Acte de naissance (copie intégrale)', 500, 1, 3, TRUE),
((SELECT id FROM services WHERE nom = 'Naissance'), 'Extrait de naissance', 300, 1, 2, TRUE),
((SELECT id FROM services WHERE nom = 'Naissance'), 'Jugement supplétif de naissance', 2000, 5, 15, TRUE)
ON CONFLICT DO NOTHING;

-- Service Mariage
INSERT INTO activites (service_id, nom, prix, delai_min_jours, delai_max_jours, actif) VALUES
((SELECT id FROM services WHERE nom = 'Mariage'), 'Acte de mariage (copie intégrale)', 1000, 2, 5, TRUE),
((SELECT id FROM services WHERE nom = 'Mariage'), 'Extrait de mariage', 500, 1, 3, TRUE),
((SELECT id FROM services WHERE nom = 'Mariage'), 'Célébration de mariage civil', 5000, 30, 90, TRUE)
ON CONFLICT DO NOTHING;

-- Service Décès
INSERT INTO activites (service_id, nom, prix, delai_min_jours, delai_max_jours, actif) VALUES
((SELECT id FROM services WHERE nom = 'Décès'), 'Acte de décès', 500, 1, 2, TRUE),
((SELECT id FROM services WHERE nom = 'Décès'), 'Déclaration de décès', 0, 1, 1, TRUE)
ON CONFLICT DO NOTHING;

-- Service Permis de Construire
INSERT INTO activites (service_id, nom, prix, delai_min_jours, delai_max_jours, actif) VALUES
((SELECT id FROM services WHERE nom = 'Permis de Construire'), 'Permis de construire (maison individuelle)', 50000, 30, 60, TRUE),
((SELECT id FROM services WHERE nom = 'Permis de Construire'), 'Permis de construire (immeuble)', 150000, 45, 90, TRUE)
ON CONFLICT DO NOTHING;
