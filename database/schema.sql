-- Table des régions (pré-remplie)
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

-- Table des départements
CREATE TABLE IF NOT EXISTS departements (
    id SERIAL PRIMARY KEY,
    region_id INT REFERENCES regions(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

-- Table des communes
CREATE TABLE IF NOT EXISTS communes (
    id SERIAL PRIMARY KEY,
    departement_id INT REFERENCES departements(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

-- Table des centres d'état civil
CREATE TABLE IF NOT EXISTS centres (
    id SERIAL PRIMARY KEY,
    commune_id INT REFERENCES communes(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

-- Table des utilisateurs (tous rôles)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom_complet VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'directeur', 'officier', 'agent', 'citoyen')),
    commune_id INT REFERENCES communes(id) ON DELETE SET NULL,
    centre_id INT REFERENCES centres(id) ON DELETE SET NULL,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ============================================================
-- CATALOGUE GLOBAL (géré par Super Admin uniquement)
-- ============================================================

-- Table des bureaux (catalogue global)
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

-- Table des services (catalogue global — SANS commune_id)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    bureau_id INT REFERENCES bureaux(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    icone VARCHAR(50),
    actif BOOLEAN DEFAULT true,
    config JSONB
);

-- Table des activités (catalogue global — liées au service global)
CREATE TABLE IF NOT EXISTS activites (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prix INT NOT NULL,
    delai_min_jours INT NOT NULL,
    delai_max_jours INT NOT NULL,
    champs_requis JSONB,
    motifs JSONB,
    actif BOOLEAN DEFAULT true
);

-- Table des champs dynamiques (formulaire no-code par activité)
CREATE TABLE IF NOT EXISTS champs_dynamiques (
    id          SERIAL PRIMARY KEY,
    activite_id INTEGER NOT NULL REFERENCES activites(id) ON DELETE CASCADE,
    nom_champ   VARCHAR(100) NOT NULL,
    label       VARCHAR(200) NOT NULL,
    type_champ  VARCHAR(30)  NOT NULL DEFAULT 'text',
    obligatoire BOOLEAN      NOT NULL DEFAULT TRUE,
    options     JSONB,
    conditions  JSONB,
    motif_lie   VARCHAR(100),
    ordre       INTEGER      NOT NULL DEFAULT 0,
    placeholder VARCHAR(200),
    actif       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================
-- CONFIGURATION PAR COMMUNE
-- (gérée par Admin Commune / Département / Région)
-- Chaque niveau peut configurer pour les niveaux inférieurs.
-- ============================================================

-- Quels bureaux sont activés dans quelle commune
CREATE TABLE IF NOT EXISTS commune_bureaux (
    id              SERIAL PRIMARY KEY,
    commune_id      INT NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
    bureau_id       INT NOT NULL REFERENCES bureaux(id) ON DELETE CASCADE,
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    configure_par   INT REFERENCES users(id) ON DELETE SET NULL,
    configure_le    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(commune_id, bureau_id)
);

-- Quels services sont activés dans quelle commune
CREATE TABLE IF NOT EXISTS commune_services (
    id              SERIAL PRIMARY KEY,
    commune_id      INT NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
    service_id      INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    configure_par   INT REFERENCES users(id) ON DELETE SET NULL,
    configure_le    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(commune_id, service_id)
);

-- Quelles activités sont activées dans quelle commune
-- (par défaut toutes actives quand le service est activé)
CREATE TABLE IF NOT EXISTS commune_activites (
    id              SERIAL PRIMARY KEY,
    commune_id      INT NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
    activite_id     INT NOT NULL REFERENCES activites(id) ON DELETE CASCADE,
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    configure_par   INT REFERENCES users(id) ON DELETE SET NULL,
    configure_le    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(commune_id, activite_id)
);

-- Table de jointure pour affecter plusieurs activités à un Agent
CREATE TABLE IF NOT EXISTS user_activities (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    activity_id INT REFERENCES activites(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, activity_id)
);

-- Table de jointure user_services
CREATE TABLE IF NOT EXISTS user_services (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, service_id)
);

-- Table user_regions_gerees
CREATE TABLE IF NOT EXISTS user_regions_gerees (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    region_id INT REFERENCES regions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, region_id)
);

-- Table user_departements_geres
CREATE TABLE IF NOT EXISTS user_departements_geres (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    departement_id INT REFERENCES departements(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, departement_id)
);

-- Table user_communes_gerees
CREATE TABLE IF NOT EXISTS user_communes_gerees (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    commune_id INT REFERENCES communes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, commune_id)
);

-- Table des demandes
CREATE TABLE IF NOT EXISTS demandes (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    citoyen_id INT REFERENCES users(id) ON DELETE SET NULL,
    activite_id INT REFERENCES activites(id) ON DELETE SET NULL,
    commune_id INT REFERENCES communes(id) ON DELETE SET NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    donnees JSONB NOT NULL,
    documents_url JSONB,
    montant_paye INT,
    mode_paiement VARCHAR(20),
    agent_id INT REFERENCES users(id) ON DELETE SET NULL,
    officier_id INT REFERENCES users(id) ON DELETE SET NULL,
    date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP,
    date_disponibilite TIMESTAMP,
    motif_rejet TEXT,
    archive BOOLEAN DEFAULT false,
    archive_date TIMESTAMP
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20),
    titre VARCHAR(255),
    contenu TEXT,
    lu BOOLEAN DEFAULT false,
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table d'audit (toutes les actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de configuration no-code
CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table profils & permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS profils (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT true
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profil_id INT REFERENCES profils(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bureau_id INT REFERENCES bureaux(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS profil_permissions (
    profil_id INT REFERENCES profils(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (profil_id, permission_id)
);

-- Indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_demandes_citoyen ON demandes(citoyen_id);
CREATE INDEX IF NOT EXISTS idx_demandes_agent ON demandes(agent_id);
CREATE INDEX IF NOT EXISTS idx_demandes_statut ON demandes(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_date ON demandes(date_soumission);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_commune ON users(commune_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_commune_bureaux_commune ON commune_bureaux(commune_id);
CREATE INDEX IF NOT EXISTS idx_commune_services_commune ON commune_services(commune_id);
CREATE INDEX IF NOT EXISTS idx_commune_activites_commune ON commune_activites(commune_id);
CREATE INDEX IF NOT EXISTS idx_services_bureau ON services(bureau_id);
CREATE INDEX IF NOT EXISTS idx_activites_service ON activites(service_id);

-- ============================================================
-- BIOMÉTRIE ET POINTAGE
-- ============================================================

-- Table des empreintes faciales pour la reconnaissance
CREATE TABLE IF NOT EXISTS facial_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL
);

-- Table de configuration des horaires de pointage par centre ou bureau
CREATE TABLE IF NOT EXISTS pointage_config (
    id SERIAL PRIMARY KEY,
    centre_id INT UNIQUE REFERENCES centres(id) ON DELETE CASCADE,
    bureau_id INT UNIQUE REFERENCES bureaux(id) ON DELETE CASCADE,
    heure_ouverture TIME NOT NULL DEFAULT '08:00:00',
    heure_fermeture TIME NOT NULL DEFAULT '17:00:00',
    heure_limite_arrivee TIME NOT NULL DEFAULT '08:30:00',
    actif BOOLEAN NOT NULL DEFAULT true
);

-- Table des pointages journaliers des agents
CREATE TABLE IF NOT EXISTS pointages (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    heure_arrivee TIME,
    heure_depart TIME,
    statut VARCHAR(20) NOT NULL, -- PRESENT, RETARD, ABSENT
    centre_id INT REFERENCES centres(id) ON DELETE SET NULL,
    bureau_id INT REFERENCES bureaux(id) ON DELETE SET NULL,
    UNIQUE(user_id, date)
);
