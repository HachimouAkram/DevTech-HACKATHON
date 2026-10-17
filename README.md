<div align="center">

<img src="mobile/assets/images/logo.png" alt="SenInnov Logo" width="100" />

# 🇸🇳 SenInnov — Plateforme Numérique d'État Civil
### Hackathon DevTech — Innovation & Dématérialisation

**SenInnov** est une plateforme complète et moderne de gestion de l'état civil, conçue pour moderniser et dématérialiser les démarches administratives au Sénégal.  
Elle permet aux citoyens de soumettre leurs demandes d'actes d'état civil depuis leur smartphone avec assistance IA, et aux agents et officiers de les instruire, signer et valider depuis un tableau de bord web centralisé.

[![Repository](https://img.shields.io/badge/GitHub-DevTech--HACKATHON-blue?style=flat-square&logo=github)](https://github.com/HachimouAkram/DevTech-HACKATHON)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%203.4-6db33f?style=flat-square&logo=spring)](https://spring.io/projects/spring-boot)
[![IA Engine](https://img.shields.io/badge/IA%20Engine-FastAPI%20%2F%20Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Dashboard-React%2019%20%2B%20Vite-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%2054%20%2F%20React%20Native-000020?style=flat-square&logo=expo)](https://expo.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2015-4169e1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](mobile/LICENSE)

</div>

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture Globale](#-architecture-globale)
- [Structure du Projet](#-structure-du-projet)
- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation & Démarrage](#-installation--démarrage)
  - [1. Cloner le projet](#1-cloner-le-dépôt)
  - [2. Base de données & Services (Docker)](#2-base-de-données--services-docker)
  - [3. Backend REST (Spring Boot)](#3-backend-spring-boot)
  - [4. Moteur IA & Reconnaissance Faciale (FastAPI)](#4-moteur-ia--reconnaissance-faciale-fastapi)
  - [5. Dashboard Administrateur (React)](#5-dashboard-admin-react)
  - [6. Application Mobile (Expo)](#6-application-mobile-expo)
- [Configuration des Variables d'Environnement](#-configuration-des-variables-denvironnement)
- [Architecture API REST & IA](#-architecture-api-rest--ia)
- [Modèle de Données](#-modèle-de-données)
- [Rôles & Permissions](#-rôles--permissions)
- [Flux de Traitement d'une Demande](#-flux-de-traitement-dune-demande)
- [Fonctionnalités Hors-Ligne (Offline)](#-fonctionnalités-hors-ligne-offline)
- [Contributeurs & Hackathon](#-contributeurs)

---

## 🌍 Vue d'ensemble

SenInnov résout un problème concret : **les citoyens sénégalais doivent souvent effectuer de longs déplacements physiques dans les mairies pour obtenir leurs actes civils**, générant lenteurs, pertes de temps et engorgement des services d'état civil.

La solution apporte un écosystème 100% interconnecté :
- 📱 **Une application mobile citoyenne & agent** (iOS & Android) : soumission de dossiers, formulaires dynamiques, paiement dématérialisé (Wave, Orange Money, PayTech), pointage biométrique et mode hors-ligne.
- 🤖 **Un module IA & Biométrie** (Python / FastAPI) : assistant virtuel intelligent (Cohere / Groq), pointage par reconnaissance faciale pour agents, et vérification automatisée.
- 🖥️ **Un tableau de bord web complet** : traitement des dossiers, signature électronique, concepteur de formulaires drag & drop, gestion géographique et statistiques temps réel.
- ⚙️ **Un backend Spring Boot haute performance** : architecture sécurisée par JWT, génération de documents officiels PDF avec QR Code certifié.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    📱 APPLICATION MOBILE                         │
│              (Expo / React Native — iOS & Android)               │
│         - Espace Citoyen (Demandes, Suivi, Paiement, Recours)    │
│         - Espace Agent Nomade (Pointage, Instruction mobile)     │
└───────────────────┬─────────────────────────┬───────────────────┘
                    │                         │
                    │ REST API                │ FastAPI / IA
                    ▼                         ▼
┌──────────────────────────────────────┐  ┌───────────────────────┐
│         🌐 BACKEND REST              │  │     🤖 MOTEUR IA      │
│   Spring Boot 3.4 — Port 5000 / 18080│  │ FastAPI — 8000 / 18000│
│                                      │  │                       │
│  - Auth JWT & Permissions granulaires│  │ - Assistant Virtuel   │
│  - 15+ Contrôleurs métiers REST      │  │   (Cohere & Groq)     │
│  - Formulaires dynamiques JSONB      │  │ - Biométrie Faciale   │
│  - Génération PDF & QR Code officiel │  │ - Analyse & Pointage  │
└───────────────────┬──────────────────┘  └───────────┬───────────┘
                    │                                 │
                    ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               🗄️ PERSISTANCE & DONNÉES                           │
│   PostgreSQL 15 (Port 5440)  │  Redis 7 (Cache/Queue - 6381)    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   🖥️ DASHBOARD ADMIN & OFFICIERS                 │
│              React 19 + Vite — Port 5173 / 15173                │
│                                                                 │
│  Agents ──► Vérification & Instruction des dossiers             │
│  Officiers ──► Validation légale, Signature, Génération PDF     │
│  Admins ──► FormDesigner drag & drop, Paramétrage centres       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet

```
DevTech-HACKATHON/
│
├── 📦 backend/                      # API REST Java (Spring Boot 3.4)
│   ├── src/main/java/com/terangacivil/backend/
│   │   ├── controller/              # Contrôleurs REST (Auth, Demandes, Users, etc.)
│   │   ├── model/                   # 19 entités JPA
│   │   ├── repository/              # Interfaces Spring Data JPA
│   │   ├── service/                 # Services métier (PDF, QR Code, Demandes)
│   │   ├── security/                # Spring Security + JWT
│   │   └── config/                  # Configuration CORS, multipart
│   ├── build.gradle                 # Dépendances Gradle
│   └── .env                         # Variables d'environnement
│
├── 🤖 ia/                           # Microservice IA & Biométrie (FastAPI)
│   ├── api/routers/                 # Endpoints : chat, pointage, payment, reports
│   ├── services/                    # Logique IA (Cohere, Groq)
│   ├── face_rec.py                  # Reconnaissance faciale & encodages
│   ├── main.py                      # Application FastAPI (Port 8000)
│   ├── requirements.txt             # Dépendances Python
│   └── .env                         # Clés d'API (Cohere, Groq, PayTech)
│
├── 🖥️ dashboard/                    # Interface Web Admin (React 19 + Vite)
│   ├── src/
│   │   ├── pages/                   # DemandesList, FormDesigner, UsersList, etc.
│   │   ├── components/              # Composants UI, Sidebar, Topbar
│   │   └── utils/api.js             # Client Axios centralisé
│   ├── vite.config.js
│   └── package.json
│
├── 📱 mobile/                       # Application Mobile (React Native / Expo 54)
│   ├── src/
│   │   ├── app/                     # Navigation Expo Router (auth, tabs, agent)
│   │   ├── components/              # Composants graphiques & widgets
│   │   ├── database/localDb.ts      # Cache SQLite pour mode hors-ligne
│   │   └── services/SyncEngine.ts   # Synchronisation automatique bidirectionnelle
│   ├── app.json
│   └── package.json
│
├── 🗄️ database/                     # Scripts de schéma SQL et initialisation
│   ├── schema.sql                   # Schéma relationnel complet
│   └── dynamic_schema.sql           # Schéma pour formulaires dynamiques
├── 🐳 docker-compose.yml            # Orchestration des services
└── 📖 README.md                     # Documentation officielle
```

---

## ✨ Fonctionnalités

### 📱 Application Mobile (Citoyens & Agents)
| Fonctionnalité | Description |
|---|---|
| **Catalogue des actes** | Navigation par région, bureau/mairie, service et acte civil |
| **Formulaires intelligents** | Génération dynamique à partir du schéma central avec champs conditionnels |
| **Upload de justificatifs** | Numérisation de documents via appareil photo ou sélecteur PDF |
| **Paiement intégré** | Intégration Wave, Orange Money et passerelle de test PayTech |
| **Assistant IA intégré** | Chatbot d'aide aux démarches administratives disponible 24/7 |
| **Pointage facial agent** | Enregistrement de présence avec reconnaissance biométrique |
| **Mode Hors-Ligne (Offline)** | Enregistrement SQLite local et synchronisation automatique en cas de reconnexion |
| **Recours & Notation** | Soumission de recours gratuit en cas de rejet et évaluation de la qualité du service |

### 🖥️ Dashboard Admin (Agents & Officiers)
| Fonctionnalité | Description |
|---|---|
| **Tableau de bord KPI** | Statistiques en direct sur les demandes, délais de traitement et activités des centres |
| **Instruction des dossiers** | Examen des justificatifs, validation étape par étape et gestion des statuts |
| **Concepteur de formulaires** | Concepteur visuel drag & drop pour adapter les formulaires à chaque commune |
| **Signature & Acte officiel** | Génération de documents sécurisés avec QR Code unique vérifiable |
| **Gestion géographique** | Administration des 14 régions, départements, communes et centres d'état civil |
| **Temps réel SSE** | Réception immédiate des nouvelles demandes sans rafraîchir la page |

---

## 🛠️ Stack Technique

| Domaine | Technologies |
|---|---|
| **Backend** | Spring Boot 3.4, Java 23, Spring Security, JWT (jjwt), Hibernate, OpenPDF, ZXing |
| **Microservice IA** | Python 3.11+, FastAPI, Cohere API, Groq, OpenCV, Uvicorn |
| **Web Dashboard** | React 19, Vite, React Router DOM v6, Recharts, Lucide, dnd-kit |
| **Mobile** | Expo 54, React Native 0.81, TypeScript, Expo SQLite, Reanimated |
| **Données & DevOps** | PostgreSQL 15 (JSONB), Redis 7, Docker, Docker Compose |

---

## ✅ Prérequis

- **Java JDK 23**
- **Node.js 20 LTS** & **npm 10+**
- **Python 3.11+**
- **Docker & Docker Compose**
- **Expo CLI** (`npm install -g expo-cli`)

---

## 🚀 Installation & Démarrage

### 1. Cloner le dépôt

```bash
git clone https://github.com/HachimouAkram/DevTech-HACKATHON.git
cd DevTech-HACKATHON
```

---

### 2. Base de données & Services (Docker)

Vous pouvez lancer les conteneurs pré-configurés via Docker Compose :

```bash
docker-compose up -d --build
```

Services exposés :
- Backend : `http://localhost:18080`
- Service IA : `http://localhost:18000`
- Dashboard Web : `http://localhost:15173`

---

### 3. Backend (Spring Boot)

Si vous préférez exécuter le backend directement en local :

```bash
cd backend
./gradlew bootRun
```
> ✅ L'API est disponible sur **`http://localhost:5000/api`**

---

### 4. Moteur IA & Reconnaissance Faciale (FastAPI)

```bash
cd ia
python -m venv .venv
# Sur Windows :
.venv\Scripts\activate
# Sur Linux/macOS :
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
> ✅ API IA disponible sur **`http://localhost:8000`** (Documentation Swagger sur `/docs`)

---

### 5. Dashboard Admin (React)

```bash
cd dashboard
npm install
npm run dev
```
> ✅ Le dashboard est accessible sur **`http://localhost:5173`**

**Identifiants par défaut :**
```text
Email    : admin@teranga.sn
Mot de passe : admin123
```

---

### 6. Application Mobile (Expo)

```bash
cd mobile
npm install
npx expo start -c
```
Scannez le QR Code affiché dans le terminal avec l'application **Expo Go** (Android/iOS).

---

## 🔧 Configuration des Variables d'Environnement

### Backend — `backend/.env`
```env
PORT=5000
DATABASE_URL=postgresql://postgres:securepassword@localhost:5440/seninnov
JWT_SECRET=terangacivil2026_super_secret_jwt_key_123456
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### Module IA — `ia/.env`
```env
DATABASE_URL=postgresql://postgres:securepassword@localhost:5440/seninnov
COHERE_API_KEY=votre_cle_cohere
GROQ_API_KEY=votre_cle_groq
PAYTECH_API_KEY=6e7efb60ea38e3d394b70469a73b6e0dc62ee8cc4d201ee1739de45606453e0d
PAYTECH_API_SECRET=ad7cdb662650e35c7fb7bb5140ba3216c5319bfc1901508ba66ff36b1f34d2cb
PAYTECH_ENV=test
```

---

## 🔄 Flux de Traitement d'une Demande

```
📱 Citoyen soumet la demande    ──► [en_attente]
                                          │
👷 Agent instruit le dossier    ──► [en_cours]
                                          │
🔍 Vérification des pièces      ──► [verification_dossier]
                                          │
📝 Rédaction et validation     ──► [en_traitement]
                                          │
✍️  Officier signe électroniquement ──► [signature]
                                          │
        ┌─────────────────────────────────┤
        ▼                                 ▼
   [rejete]                        [valide / pret]
   + Motif communiqué au citoyen    + PDF officiel généré
   + Recours possible sous 15 jours + QR Code d'authenticité
                                    📱 Téléchargement immédiat
```

---

## 📶 Fonctionnalités Hors-Ligne (Offline)

1. **Détection réseau automatique** : Écoute continue de l'état de la connexion réseau.
2. **Stockage SQLite local** : Sauvegarde locale des demandes soumises en zone blanche ou sans réseau.
3. **Moteur de synchronisation (`SyncEngine`)** : Transmission automatique en arrière-plan vers le serveur dès le rétablissement d'Internet.
4. **Continuité de service** : Les agents sur le terrain et les citoyens peuvent continuer à enregistrer des actes sans interruption.

---

## 🤝 Contributeurs

Projet développé avec passion dans le cadre du **DevTech HACKATHON** par l'équipe **SenInnov**.

- Repository officiel : [HachimouAkram/DevTech-HACKATHON](https://github.com/HachimouAkram/DevTech-HACKATHON)

---

## 📄 Licence

Ce projet est sous licence **MIT** — voir le fichier [mobile/LICENSE](mobile/LICENSE) pour plus de détails.

<div align="center">

**SenInnov** — *La modernisation de l'état civil au service de chaque citoyen sénégalais 🇸🇳*

</div>
