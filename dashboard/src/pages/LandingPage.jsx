import { isCitizenUser } from '../utils/roles.js';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Lock,
  Check,
  Sparkles,
  Search,
  Send,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ExternalLink,
  Award,
  Globe,
  ChevronDown,
  ChevronUp,
  Landmark,
  BadgeCheck,
  QrCode,
  Scan,
  Shield,
  Heart,
  Baby,
  FileCheck,
  Sun,
  Moon
} from 'lucide-react';
import './LandingPage.css';

// Dictionnaire de traductions (Français, Anglais, Wolof)
const TRANSLATIONS = {
  fr: {
    nav: {
      accueil: "Accueil",
      services: "Nos Services",
      verification: "Vérification QR",
      demarches: "Comment ça marche",
      apropos: "À Propos",
      contact: "Contact",
      connexion: "Connexion",
      dashboard: "Tableau de Bord"
    },
    hero: {
      badge: "🇸🇳 Modernisation & Dématérialisation de l'État Civil",
      titlePre: "L'État Civil Sénégalais, ",
      titleGreen: "100% Dématérialisé",
      titleAnd: " & ",
      titleGold: "Accessible à Tous.",
      desc: "Demandez, suivez et recevez vos actes officiels (naissance, mariage, décès) en quelques clics sans déplacement physique. Une plateforme moderne conçue pour les citoyens, les mairies et la diaspora sénégalaise.",
      ctaPrimary: "Se Connecter au Portail",
      ctaSecondary: "Découvrir les Actes",
      trustCdp: "Conforme CDP Sénégal",
      trustQr: "QR Code Inviolable",
      trustIa: "Assistance IA 24/7"
    },
    stats: {
      subtitle: "IMPACT & PERFORMANCE NATIONALE",
      title: "La transformation digitale au service de nos concitoyens",
      citizens: "Citoyens Enregistrés",
      citizensDesc: "Usagers actifs sur l'application mobile & web",
      acts: "Actes Officiels Délivrés",
      actsDesc: "Certifiés avec signature et QR Code sécurisé",
      centers: "Centres d'État Civil",
      centersDesc: "Répartis à travers les 14 régions du Sénégal",
      delay: "Délai Moyen de Traitement",
      delayDesc: "Contre 3 semaines auparavant en mairie"
    }
  },
  en: {
    nav: {
      accueil: "Home",
      services: "Our Services",
      verification: "QR Verification",
      demarches: "How It Works",
      apropos: "About Us",
      contact: "Contact",
      connexion: "Login",
      dashboard: "Dashboard"
    },
    hero: {
      badge: "🇸🇳 Senegalese Digital Civil Registry",
      titlePre: "Senegalese Civil Status, ",
      titleGreen: "100% Digitalized",
      titleAnd: " & ",
      titleGold: "Accessible to Everyone.",
      desc: "Request, track and obtain your certified official records (birth, marriage, death) in a few clicks without travelling. A secure platform built for citizens, city halls and the diaspora.",
      ctaPrimary: "Sign In to Portal",
      ctaSecondary: "Explore Records",
      trustCdp: "CDP Certified Privacy",
      trustQr: "Tamper-proof QR Code",
      trustIa: "24/7 AI Assistance"
    },
    stats: {
      subtitle: "NATIONAL PERFORMANCE & REACH",
      title: "Digital modernization serving our citizens everyday",
      citizens: "Registered Citizens",
      citizensDesc: "Active users across mobile and web platforms",
      acts: "Certified Documents Issued",
      actsDesc: "Secured with electronic seal & official QR code",
      centers: "Civil Registry Centers",
      centersDesc: "Connected across Senegal's 14 administrative regions",
      delay: "Average Processing Time",
      delayDesc: "Reduced from 3 weeks to less than 24 hours"
    }
  },
  wo: {
    nav: {
      accueil: "Dalal ak jàmm",
      services: "Sunuy Cër",
      verification: "Seet QR Code",
      demarches: "Naka lañuy def",
      apropos: "Ci ñun",
      contact: "Jokkoo",
      connexion: "Dugg",
      dashboard: "Tàbbalu liggéey"
    },
    hero: {
      badge: "🇸🇳 Ndimbalu nguur gi ci wallu kaye yu njëkk",
      titlePre: "Keeyitu juddu ak seyy ci réewum Senegaal, ",
      titleGreen: "100% ci internet",
      titleAnd: " te ",
      titleGold: "yomb na képp ku ko soxla.",
      desc: "Sakku, toftal te jot sa keeyiti juddu, seyy walla faatu ci ay saa yu néew te dotoo dem méeeri. SenInnov ngir askan wi ak mbokk yi nekk bitim réew.",
      ctaPrimary: "Dugg ci sitti bi",
      ctaSecondary: "Gis keeyit yi",
      trustCdp: "Kaaraange gu wér (CDP)",
      trustQr: "QR Code bu kenn mënut fente",
      trustIa: "Ndimbal 24h/24"
    },
    stats: {
      subtitle: "LI ÑU JËFE CI REEW MI",
      title: "Xarala yu yees ngir gën a yombal doxalin yi",
      citizens: "Askan wu bindu",
      citizensDesc: "Nit ñiy jëfandikoo aplikasiyoŋ bi",
      acts: "Keeyit yu ñu maye",
      actsDesc: "Am nañu xaatim ak QR Code bu wér",
      centers: "Méeeri yi ci boole",
      centersDesc: "Ci 14 diwaani Senegaal yépp",
      delay: "Waxtu bi mu lay laaj",
      delayDesc: "Bi mu ko dore ay fan la ci kow ay ayi-bis"
    }
  }
};

// Hook pour animer un compteur de façon fluide
function useCountUp(end, duration = 2200, startAnimation = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startAnimation) return;
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, startAnimation]);

  return count;
}

function AnimatedStat({ value, suffix = '', prefix = '', duration = 2000 }) {
  const count = useCountUp(value, duration);
  const formatted = count.toLocaleString('fr-FR');
  return <span>{prefix}{formatted}{suffix}</span>;
}

export default function LandingPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [selectedService, setSelectedService] = useState(null);

  // Gestion du Thème (Dark / Light) synchronisé avec le document
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Gestion de la Langue (Français, Anglais, Wolof)
  const [currentLang, setCurrentLang] = useState('fr');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.fr;

  // Fermer le dropdown langue si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulateur de Vérification QR
  const [verifyCode, setVerifyCode] = useState('SN-DKR-2026-N08942');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState({
    status: 'success',
    code: 'SN-DKR-2026-N08942',
    titulaire: 'Aminata Ndiaye',
    type: 'Extrait du Registre des Actes de Naissance',
    centre: 'Mairie de Dakar-Plateau',
    dateDelivrance: '15 Octobre 2026',
    officier: "Mamadou Diop (Officier d'État Civil)",
    empreinte: 'SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f'
  });

  // Formulaire de contact
  const [contactForm, setContactForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    commune: '',
    sujet: 'Renseignement sur une démarche',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Détection du scroll pour la navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Défilement fluide vers une section
  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -85;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Test de vérification QR
  const handleVerify = (e) => {
    e?.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setTimeout(() => {
      setVerifyLoading(false);
      setVerifyResult({
        status: 'success',
        code: verifyCode.toUpperCase(),
        titulaire: 'Moussa Seck',
        type: "Copie Littérale d'Acte de Naissance",
        centre: "Centre d'État Civil de Saint-Louis Nord",
        dateDelivrance: new Date().toLocaleDateString('fr-FR'),
        officier: 'Aïssatou Sow (Adjointe au Maire)',
        empreinte: 'SHA256: 3c9909afec25354d551dae21590bb26e38d53f21'
      });
    }, 700);
  };

  // Envoi du formulaire de contact
  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactLoading(true);
    setTimeout(() => {
      setContactLoading(false);
      setContactSubmitted(true);
      setContactForm({
        nom: '',
        email: '',
        telephone: '',
        commune: '',
        sujet: 'Renseignement sur une démarche',
        message: ''
      });
      setTimeout(() => setContactSubmitted(false), 8000);
    }, 800);
  };

  // Services proposés
  const servicesList = [
    {
      id: 'naissance',
      title: 'Extrait de Naissance',
      icon: <Baby size={28} />,
      colorClass: 'green',
      category: 'État Civil',
      description: "Demande d'extrait ou copie littérale d'acte de naissance certifié pour vos démarches (Passeport, CNI, Écoles, Concours).",
      delai: '< 24 Heures',
      pieces: ["Copie de l'ancien acte ou numéro de registre", "Pièce d'identité du demandeur"],
      tarifs: 'Gratuit ou timbre légal'
    },
    {
      id: 'mariage',
      title: 'Certificat de Mariage',
      icon: <Heart size={28} />,
      colorClass: 'gold',
      category: 'Famille',
      description: "Déclaration d'union civile et obtention d'extraits officiels avec mentions marginales authentifiées par l'officier.",
      delai: '24 - 48 Heures',
      pieces: ["Numéro de livret de famille", "Cartes d'identité des époux"],
      tarifs: 'Tarif communal en vigueur'
    },
    {
      id: 'deces',
      title: 'Certificat de Décès',
      icon: <FileText size={28} />,
      colorClass: 'blue',
      category: 'Formalités',
      description: "Enregistrement rapide et dématérialisé pour la délivrance d'actes de décès indispensables aux successions et formalités.",
      delai: 'Moins de 24h (Urgent)',
      pieces: ["Certificat médical de décès", "Pièce d'identité du déclarant"],
      tarifs: 'Gratuit'
    },
    {
      id: 'nationalite',
      title: 'Certificat de Nationalité',
      icon: <Award size={28} />,
      colorClass: 'purple',
      category: 'Nationalité',
      description: "Attestation légale de citoyenneté sénégalaise établie avec les juridictions compétentes et les registres territoriaux.",
      delai: '48 Heures',
      pieces: ["Extrait de naissance", "Pièces justificatives des ascendants"],
      tarifs: 'Fixé par le tribunal'
    },
    {
      id: 'verification',
      title: 'Authentification QR Code',
      icon: <QrCode size={28} />,
      colorClass: 'green',
      category: 'Sécurité Numérique',
      description: "Système de contrôle immédiat d'authenticité pour les ambassades, banques, notaires et administrations partenaires.",
      delai: 'Instantané (Temps réel)',
      pieces: ["Code unique figurant sur le document officiel"],
      tarifs: '100% Gratuit & Ouvert'
    },
    {
      id: 'biometrie',
      title: 'Pointage & IA Citoyenne',
      icon: <Sparkles size={28} />,
      colorClass: 'gold',
      category: 'Innovation',
      description: "Assistance intelligente 24/7 en Français et Wolof pour orienter vos démarches, complétée par le pointage biométrique des agents.",
      delai: 'Disponible 24h/24',
      pieces: ["Aucune démarche préalable requise"],
      tarifs: 'Service public inclus'
    }
  ];

  // FAQ
  const faqs = [
    {
      q: "Les actes délivrés en ligne sur SenInnov sont-ils légalement reconnus ?",
      a: "Absolument. Conformément à la législation sénégalaise relative à la dématérialisation administrative et à la loi sur la protection des données (CDP), chaque acte délivré comporte un QR code sécurisé certifié par clé cryptographique SHA-256 et la signature électronique légale de l'Officier d'État Civil. Il possède la même valeur juridique que l'acte papier traditionnel."
    },
    {
      q: "Comment puis-je suivre l'avancement de ma demande d'acte civil ?",
      a: "Dès que vous soumettez une demande sur l'application mobile ou auprès d'un centre partenaire, un numéro de suivi unique (ex: SN-DKR-2026-N08942) vous est attribué. Vous recevez des notifications SMS et vous pouvez suivre en direct les étapes (Instruction, Validation de l'Officier, Délivrance)."
    },
    {
      q: "Puis-je effectuer une demande pour un centre situé dans une autre région ?",
      a: "Oui. Grâce à l'interconnexion nationale des 14 régions et des 552 centres d'état civil, vous pouvez soumettre une demande pour votre commune de naissance sans avoir à voyager physiquement."
    },
    {
      q: "Comment les ambassades et les universités peuvent-elles vérifier un acte ?",
      a: "N'importe quelle entité tierce (consulats, banques, employeurs, universités) peut scanner le QR code imprimé sur l'acte officiel ou renseigner la référence sur notre vérificateur public pour voir instantanément les détails certifiés du registre d'origine."
    },
    {
      q: "Mes données personnelles sont-elles sécurisées ?",
      a: "La plateforme applique des normes de sécurité gouvernementales de pointe : chiffrement des échanges en TLS 1.3, conformité totale avec la Commission des Données Personnelles (CDP) du Sénégal, et hébergement souverain sécurisé."
    }
  ];

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'wo', label: 'Wolof', flag: '🇸🇳' }
  ];

  const currentLangObj = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <div className="landing-page">
      {/* ====================================================================
          BARRE DE NAVIGATION PLEIN ÉCRAN
          (Logo à gauche toute, Liens au centre, Langue/Thème/Connexion à droite toute)
          ==================================================================== */}
      <nav className={`lp-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="lp-navbar-full">
          {/* GAUCHE : Logo & Identité SenInnov */}
          <div className="lp-nav-left">
            <Link to="/" className="lp-brand">
              <div className="lp-brand-logo-wrap">
                <img src="/logo.png" alt="SenInnov Logo" />
              </div>
              <div className="lp-brand-text">
                <div className="lp-brand-title">
                  <span className="sn-flag">🇸🇳</span>
                  <span>SenInnov</span>
                  <span className="brand-accent">Civil</span>
                </div>
                <span className="lp-brand-sub">République du Sénégal</span>
              </div>
            </Link>
          </div>

          {/* CENTRE : Liens Desktop mathématiquement centrés */}
          <div className="lp-nav-center">
            <ul className="lp-nav-links">
              <li>
                <a href="#accueil" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'accueil')}>
                  {t.nav.accueil}
                </a>
              </li>
              <li>
                <a href="#services" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'services')}>
                  {t.nav.services}
                </a>
              </li>
              <li>
                <a href="#verification-qr" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'verification-qr')}>
                  {t.nav.verification}
                </a>
              </li>
              <li>
                <a href="#demarches" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'demarches')}>
                  {t.nav.demarches}
                </a>
              </li>
              <li>
                <a href="#apropos" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'apropos')}>
                  {t.nav.apropos}
                </a>
              </li>
              <li>
                <a href="#contact" className="lp-nav-link" onClick={(e) => scrollToSection(e, 'contact')}>
                  {t.nav.contact}
                </a>
              </li>
            </ul>
          </div>

          {/* DROITE : Sélecteur Langue + Toggle Thème + Bouton Connexion */}
          <div className="lp-nav-right">
            {/* Dropdown de Langue */}
            <div className="lp-lang-dropdown" ref={langDropdownRef}>
              <button
                type="button"
                className="lp-lang-btn"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                aria-label="Changer de langue"
              >
                <span>{currentLangObj.flag}</span>
                <span>{currentLangObj.code.toUpperCase()}</span>
                <ChevronDown size={14} />
              </button>

              {langDropdownOpen && (
                <div className="lp-lang-menu">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={`lp-lang-item ${currentLang === item.code ? 'selected' : ''}`}
                      onClick={() => {
                        setCurrentLang(item.code);
                        setLangDropdownOpen(false);
                      }}
                    >
                      <span>{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton de changement de thème (Sombre / Clair) */}
            <button
              type="button"
              className="lp-theme-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Basculer en Mode Sombre' : 'Basculer en Mode Clair'}
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="#fbbf24" />}
            </button>

            {/* Bouton Connexion */}
            {user ? (
              <Link
                to={isCitizenUser(user) ? "/citoyen" : "/dashboard"}
                className="lp-btn-logged-in"
                title={isCitizenUser(user) ? "Accéder à mon espace citoyen" : "Accéder au tableau de bord"}
              >
                <div className="user-avatar-tiny">
                  {user.nom ? user.nom.charAt(0).toUpperCase() : (user.nom_complet ? user.nom_complet.charAt(0).toUpperCase() : 'C')}
                </div>
                <span>{isCitizenUser(user) ? 'Mon Espace Citoyen' : t.nav.dashboard}</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <Link to="/login" className="lp-btn-login" id="nav-btn-connexion">
                <Lock size={15} />
                <span>{t.nav.connexion}</span>
              </Link>
            )}

            {/* Bouton Hamburger Mobile */}
            <button
              className="lp-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu Mobile"
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Menu Déroulant Mobile */}
        <div className={`lp-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#accueil" onClick={(e) => scrollToSection(e, 'accueil')}>{t.nav.accueil}</a>
          <a href="#services" onClick={(e) => scrollToSection(e, 'services')}>{t.nav.services}</a>
          <a href="#verification-qr" onClick={(e) => scrollToSection(e, 'verification-qr')}>{t.nav.verification}</a>
          <a href="#demarches" onClick={(e) => scrollToSection(e, 'demarches')}>{t.nav.demarches}</a>
          <a href="#apropos" onClick={(e) => scrollToSection(e, 'apropos')}>{t.nav.apropos}</a>
          <a href="#contact" onClick={(e) => scrollToSection(e, 'contact')}>{t.nav.contact}</a>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="lp-theme-btn"
              onClick={toggleTheme}
              style={{ width: 'auto', flex: 1, gap: '0.5rem', display: 'flex' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} color="#fbbf24" />}
              <span>{theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}</span>
            </button>

            <button
              type="button"
              className="lp-lang-btn"
              onClick={() => {
                const nextLang = currentLang === 'fr' ? 'en' : currentLang === 'en' ? 'wo' : 'fr';
                setCurrentLang(nextLang);
              }}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <span>{currentLangObj.flag} {currentLangObj.label}</span>
            </button>
          </div>

          {user ? (
            <Link
              to={isCitizenUser(user) ? "/citoyen" : "/dashboard"}
              className="lp-btn-primary"
              style={{ textAlign: 'center', marginTop: '1rem', justifyContent: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {isCitizenUser(user) ? 'Mon Espace Citoyen' : t.nav.dashboard} →
            </Link>
          ) : (
            <Link to="/login" className="lp-btn-login" style={{ textAlign: 'center', marginTop: '1rem', justifyContent: 'center' }}>
              <Lock size={16} /> {t.nav.connexion}
            </Link>
          )}
        </div>
      </nav>

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <section className="lp-hero" id="accueil">
        <div className="lp-container">
          <div className="lp-hero-grid">
            {/* Contenu Gauche */}
            <div className="lp-hero-content">
              <div className="lp-hero-badge">
                <span className="lp-badge-pulse"></span>
                <span>{t.hero.badge}</span>
              </div>

              <h1 className="lp-hero-title">
                {t.hero.titlePre}
                <span className="gradient-green">{t.hero.titleGreen}</span>
                {t.hero.titleAnd}
                <span className="gradient-gold">{t.hero.titleGold}</span>
              </h1>

              <p className="lp-hero-desc">
                {t.hero.desc}
              </p>

              <div className="lp-hero-actions">
                {user ? (
                  <Link to={isCitizenUser(user) ? "/citoyen" : "/dashboard"} className="lp-btn-primary">
                    <span>{isCitizenUser(user) ? 'Accéder à mon Espace Citoyen' : t.nav.dashboard}</span>
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <Link to="/login" className="lp-btn-primary">
                    <Lock size={18} />
                    <span>{t.hero.ctaPrimary}</span>
                  </Link>
                )}

                <a
                  href="#services"
                  className="lp-btn-secondary"
                  onClick={(e) => scrollToSection(e, 'services')}
                >
                  <Search size={18} />
                  <span>{t.hero.ctaSecondary}</span>
                </a>
              </div>

              <div className="lp-hero-trust">
                <div className="lp-trust-item">
                  <ShieldCheck size={20} />
                  <span>{t.hero.trustCdp}</span>
                </div>
                <div className="lp-trust-item">
                  <CheckCircle2 size={20} />
                  <span>{t.hero.trustQr}</span>
                </div>
                <div className="lp-trust-item">
                  <Sparkles size={20} />
                  <span>{t.hero.trustIa}</span>
                </div>
              </div>
            </div>

            {/* Visuel Droite : Simulation d'un Acte Certifié Officiel */}
            <div className="lp-hero-visual">
              <div className="lp-floating-badge lp-badge-speed">
                <div className="lp-floating-icon green">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="lp-floating-title">&lt; 24h de Délai</div>
                  <div className="lp-floating-sub">Traitement accéléré</div>
                </div>
              </div>

              <div className="lp-floating-badge lp-badge-secure">
                <div className="lp-floating-icon gold">
                  <Award size={20} />
                </div>
                <div>
                  <div className="lp-floating-title">Signature Numérique</div>
                  <div className="lp-floating-sub">Officier certifié</div>
                </div>
              </div>

              <div className="lp-hero-card-preview">
                <div className="lp-card-header">
                  <div className="lp-card-header-left">
                    <div className="lp-card-seal">
                      <Landmark size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--lp-text-primary)' }}>
                        RÉPUBLIQUE DU SÉNÉGAL
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--lp-text-muted)' }}>
                        Collectivités Territoriales • Mairie de Dakar
                      </div>
                    </div>
                  </div>
                  <div className="lp-card-badge-status">
                    <Check size={14} />
                    <span>Acte Certifié</span>
                  </div>
                </div>

                <div className="lp-card-body">
                  <div className="lp-card-info-row">
                    <span className="lp-info-label">Type d'Acte</span>
                    <span className="lp-info-val">Extrait de Naissance</span>
                  </div>
                  <div className="lp-card-info-row">
                    <span className="lp-info-label">Numéro de Registre</span>
                    <span className="lp-info-val" style={{ fontFamily: 'monospace' }}>2026/DKR/N°08942</span>
                  </div>
                  <div className="lp-card-info-row">
                    <span className="lp-info-label">Titulaire</span>
                    <span className="lp-info-val">Aminata Ndiaye</span>
                  </div>
                  <div className="lp-card-info-row">
                    <span className="lp-info-label">Statut Validation</span>
                    <span className="lp-info-val" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} /> Signé Électroniquement
                    </span>
                  </div>

                  <div className="lp-card-qr-box">
                    <div className="lp-qr-code-img">
                      <QrCode size={56} color="#0f172a" />
                    </div>
                    <div>
                      <div className="lp-qr-info-title">Vérification Instantanée</div>
                      <div className="lp-qr-info-desc">
                        Scannez ce QR Code pour authentifier l'acte auprès du serveur central d'état civil.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          BANNIÈRE ANIMÉE DE STATISTIQUES & IMPACT
          (Gardée dans la page avec compteurs fluides)
          ==================================================================== */}
      <section className="lp-stats-banner" id="statistiques">
        <div className="lp-container">
          <div className="lp-stats-container">
            <div className="lp-stats-header">
              <div className="lp-stats-subtitle">{t.stats.subtitle}</div>
              <h2 className="lp-stats-title">{t.stats.title}</h2>
            </div>

            <div className="lp-stats-grid">
              <div className="lp-stat-card">
                <div className="lp-stat-icon-wrap green">
                  <Users size={26} />
                </div>
                <div className="lp-stat-number">
                  <AnimatedStat value={285400} suffix="+" />
                </div>
                <div className="lp-stat-label">{t.stats.citizens}</div>
                <div className="lp-stat-desc">{t.stats.citizensDesc}</div>
              </div>

              <div className="lp-stat-card">
                <div className="lp-stat-icon-wrap gold">
                  <FileCheck size={26} />
                </div>
                <div className="lp-stat-number">
                  <AnimatedStat value={74250} suffix="+" />
                </div>
                <div className="lp-stat-label">{t.stats.acts}</div>
                <div className="lp-stat-desc">{t.stats.actsDesc}</div>
              </div>

              <div className="lp-stat-card">
                <div className="lp-stat-icon-wrap blue">
                  <Landmark size={26} />
                </div>
                <div className="lp-stat-number">
                  <AnimatedStat value={552} />
                </div>
                <div className="lp-stat-label">{t.stats.centers}</div>
                <div className="lp-stat-desc">{t.stats.centersDesc}</div>
              </div>

              <div className="lp-stat-card">
                <div className="lp-stat-icon-wrap purple">
                  <Clock size={26} />
                </div>
                <div className="lp-stat-number">
                  <span>&lt; 24h</span>
                </div>
                <div className="lp-stat-label">{t.stats.delay}</div>
                <div className="lp-stat-desc">{t.stats.delayDesc}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION NOS SERVICES
          ==================================================================== */}
      <section className="lp-section" id="services">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">CATALOGUE DES ACTES</span>
            <h2 className="lp-section-title">Toutes vos démarches d'état civil, sans file d'attente</h2>
            <p className="lp-section-desc">
              Accédez aux formalités officielles auprès de votre commune de rattachement
              avec vérification automatique et paiement sécurisé (Wave, Orange Money).
            </p>
          </div>

          <div className="lp-services-grid">
            {servicesList.map((srv) => (
              <div key={srv.id} className="lp-service-card">
                <div className={`lp-service-icon-box ${srv.colorClass}`}>
                  {srv.icon}
                </div>
                <h3 className="lp-service-title">{srv.title}</h3>
                <p className="lp-service-desc">{srv.description}</p>
                <div className="lp-service-meta">
                  <span className="lp-service-tag">{srv.category}</span>
                  <button
                    className="lp-service-cta"
                    onClick={() => setSelectedService(srv)}
                  >
                    <span>Consulter les détails</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modale d'informations de démarche */}
      {selectedService && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 10, 20, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setSelectedService(null)}
        >
          <div
            style={{
              background: 'var(--lp-card-bg)',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '2.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              position: 'relative',
              border: '1px solid var(--lp-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedService(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--lp-card-subtle)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--lp-text-secondary)'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className={`lp-service-icon-box ${selectedService.colorClass}`} style={{ margin: 0 }}>
                {selectedService.icon}
              </div>
              <div>
                <span className="lp-service-tag">{selectedService.category}</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--lp-text-primary)' }}>
                  {selectedService.title}
                </h3>
              </div>
            </div>

            <p style={{ color: 'var(--lp-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {selectedService.description}
            </p>

            <div style={{ background: 'var(--lp-card-subtle)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--lp-border)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--lp-text-primary)', marginBottom: '0.5rem' }}>
                📋 Pièces justificatives requises :
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedService.pieces.map((p, idx) => (
                  <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--lp-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#10b981" /> {p}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--lp-text-muted)' }}>Délai indicatif : </span>
                <strong style={{ color: 'var(--lp-text-primary)' }}>{selectedService.delai}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--lp-text-muted)' }}>Frais légaux : </span>
                <strong style={{ color: '#10b981' }}>{selectedService.tarifs}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  const actId = selectedService?.id;
                  setSelectedService(null);
                  if (user) {
                    navigate(isCitizenUser(user) ? `/citoyen/demande/nouvelle?activityId=${actId}` : `/dashboard`);
                  } else {
                    navigate('/login');
                  }
                }}
                className="lp-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Initier la démarche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SIMULATEUR DE VÉRIFICATION DE QR CODE
          ==================================================================== */}
      <section className="lp-container" id="verification-qr">
        <div className="lp-verifier-section">
          <div className="lp-verifier-grid">
            <div>
              <div className="lp-section-tag" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                SÉCURITÉ & AUTHENTICITÉ
              </div>
              <h2 className="lp-verifier-title">Vérificateur Officiel d'Actes</h2>
              <p className="lp-verifier-desc">
                Ambassades, banques, notaires et employeurs : entrez le numéro unique
                présent sur l'acte ou le QR Code pour vous assurer de son authenticité
                en temps réel auprès de la base d'état civil.
              </p>

              <form onSubmit={handleVerify} className="lp-verifier-form">
                <input
                  type="text"
                  className="lp-verifier-input"
                  placeholder="Ex : SN-DKR-2026-N08942"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
                <button type="submit" className="lp-verifier-btn" disabled={verifyLoading}>
                  <Scan size={18} />
                  <span>{verifyLoading ? 'Vérification...' : 'Vérifier'}</span>
                </button>
              </form>

              <div className="lp-verifier-quick-tests">
                <span>Exemples rapides :</span>
                <button
                  type="button"
                  className="lp-quick-test-btn"
                  onClick={() => {
                    setVerifyCode('SN-DKR-2026-N08942');
                    handleVerify();
                  }}
                >
                  Dakar-Plateau (Naissance)
                </button>
                <button
                  type="button"
                  className="lp-quick-test-btn"
                  onClick={() => {
                    setVerifyCode('SN-SL-2026-M00145');
                    handleVerify();
                  }}
                >
                  Saint-Louis (Mariage)
                </button>
              </div>
            </div>

            <div className="lp-verifier-result-box">
              <div className="lp-verify-status-header">
                <div className="lp-verify-icon-wrap success">
                  <BadgeCheck size={26} />
                </div>
                <div>
                  <div style={{ color: '#34d399', fontWeight: '800', fontSize: '1.05rem' }}>
                    ACTE OFFICIEL AUTHENTIFIÉ
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Clé cryptographique conforme aux registres d'État Civil
                  </div>
                </div>
              </div>

              <div className="lp-verify-data-row">
                <span className="lp-verify-key">Référence Unique</span>
                <span className="lp-verify-val" style={{ fontFamily: 'monospace' }}>{verifyResult.code}</span>
              </div>
              <div className="lp-verify-data-row">
                <span className="lp-verify-key">Type de Document</span>
                <span className="lp-verify-val">{verifyResult.type}</span>
              </div>
              <div className="lp-verify-data-row">
                <span className="lp-verify-key">Titulaire de l'Acte</span>
                <span className="lp-verify-val">{verifyResult.titulaire}</span>
              </div>
              <div className="lp-verify-data-row">
                <span className="lp-verify-key">Centre d'Origine</span>
                <span className="lp-verify-val">{verifyResult.centre}</span>
              </div>
              <div className="lp-verify-data-row">
                <span className="lp-verify-key">Officier Signataire</span>
                <span className="lp-verify-val">{verifyResult.officier}</span>
              </div>
              <div className="lp-verify-data-row" style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="lp-verify-key">Empreinte Hash</span>
                <span className="lp-verify-val" style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  {verifyResult.empreinte}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION COMMENT ÇA MARCHE
          ==================================================================== */}
      <section className="lp-section lp-section-alt" id="demarches">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">SIMPLICITÉ & RAPIDITÉ</span>
            <h2 className="lp-section-title">Comment obtenir son acte civil en 4 étapes simples</h2>
            <p className="lp-section-desc">
              Un parcours fluide conçu pour vous faire gagner un temps précieux,
              disponible sur smartphone ou ordinateur.
            </p>
          </div>

          <div className="lp-workflow-steps">
            <div className="lp-step-card">
              <div className="lp-step-badge">1</div>
              <h3 className="lp-step-title">Sélectionnez votre acte</h3>
              <p className="lp-step-desc">
                Choisissez l'acte souhaité (naissance, mariage, décès) et votre commune de déclaration
                parmi les 14 régions du Sénégal.
              </p>
            </div>

            <div className="lp-step-card">
              <div className="lp-step-badge">2</div>
              <h3 className="lp-step-title">Remplissez les détails</h3>
              <p className="lp-step-desc">
                Renseignez les informations de l'acte et téléversez une photo de votre pièce d'identité
                avec l'aide de notre assistant intelligent.
              </p>
            </div>

            <div className="lp-step-card">
              <div className="lp-step-badge">3</div>
              <h3 className="lp-step-title">Instruction & Signature</h3>
              <p className="lp-step-desc">
                L'agent de votre mairie instruit le dossier et l'Officier d'État Civil appose
                sa signature électronique certifiée.
              </p>
            </div>

            <div className="lp-step-card">
              <div className="lp-step-badge">4</div>
              <h3 className="lp-step-title">Délivrance Numérique</h3>
              <p className="lp-step-desc">
                Téléchargez immédiatement votre acte PDF officiel doté d'un QR code infalsifiable,
                valable pour toutes vos formalités.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION À PROPOS DE NOUS
          ==================================================================== */}
      <section className="lp-section" id="apropos">
        <div className="lp-container">
          <div className="lp-about-grid">
            <div>
              <span className="lp-section-tag">VISION & MISSION RÉPUBLICAINE</span>
              <h2 className="lp-section-title">Moderniser le lien entre l'État et le Citoyen</h2>
              <p className="lp-hero-desc" style={{ marginBottom: '1.5rem' }}>
                Pendant des décennies, l'obtention d'un simple extrait de naissance nécessitait
                des déplacements éprouvants, des files d'attente interminables et exposait les
                registres papier aux aléas climatiques ou à la détérioration.
              </p>
              <p className="lp-hero-desc">
                <strong>SenInnov</strong> concrétise la volonté des pouvoirs publics sénégalais
                d'offrir un service public digne, moderne, transparent et inclusif pour tous les
                Sénégalais résidant sur le territoire national ou à l'étranger.
              </p>

              <div className="lp-about-pillars">
                <div className="lp-pillar-box">
                  <Globe size={24} />
                  <div className="lp-pillar-title">Inclusion Territoriale</div>
                  <div className="lp-pillar-desc">Accessible des grandes métropoles aux communes rurales les plus reculées.</div>
                </div>

                <div className="lp-pillar-box">
                  <ShieldCheck size={24} />
                  <div className="lp-pillar-title">Souveraineté des Données</div>
                  <div className="lp-pillar-desc">Données hébergées et protégées selon les normes de la CDP.</div>
                </div>

                <div className="lp-pillar-box">
                  <Clock size={24} />
                  <div className="lp-pillar-title">Zéro Déplacement Inutile</div>
                  <div className="lp-pillar-desc">Fin des journées de travail perdues pour une simple formalité.</div>
                </div>

                <div className="lp-pillar-box">
                  <Sparkles size={24} />
                  <div className="lp-pillar-title">Assistance IA Dédiée</div>
                  <div className="lp-pillar-desc">Accompagnement conversationnel pour chaque étape administrative.</div>
                </div>
              </div>
            </div>

            <div className="lp-about-image-card">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <img
                  src="/logo.png"
                  alt="Emblème National"
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                />
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '0.75rem', color: 'var(--lp-text-primary)' }}>
                  Direction de l'État Civil
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--lp-text-muted)' }}>
                  Ministère des Collectivités Territoriales, de l'Aménagement et du Développement des Territoires
                </p>
              </div>

              <div style={{ background: 'var(--lp-card-subtle)', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--lp-border)' }}>
                <blockquote style={{ fontStyle: 'italic', color: 'var(--lp-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                  « L'État Civil est le socle de la citoyenneté. En le dématérialisant avec SenInnov,
                  nous garantissons l'identité juridique de chaque Sénégalais dès sa naissance, avec une
                  totale équité d'accès au service public. »
                </blockquote>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    TC
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--lp-text-primary)' }}>Comité de Modernisation Numérique</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--lp-text-muted)' }}>Hackathon DevTech Sénégal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION FOIRE AUX QUESTIONS (FAQ)
          ==================================================================== */}
      <section className="lp-section lp-section-alt" id="faq">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">QUESTIONS FRÉQUENTES</span>
            <h2 className="lp-section-title">Tout ce que vous devez savoir</h2>
            <p className="lp-section-desc">
              Des réponses claires à vos interrogations sur la validité, les délais et l'utilisation de la plateforme.
            </p>
          </div>

          <div className="lp-faq-container">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`lp-faq-item ${isOpen ? 'active' : ''}`}>
                  <button
                    className="lp-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={20} color="#10b981" /> : <ChevronDown size={20} color="var(--lp-text-muted)" />}
                  </button>
                  {isOpen && <div className="lp-faq-answer">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION NOUS CONTACTER & SUPPORT
          ==================================================================== */}
      <section className="lp-section" id="contact">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">ASSISTANCE & ÉCOUTE</span>
            <h2 className="lp-section-title">Une question ? Besoin d'assistance ?</h2>
            <p className="lp-section-desc">
              Nos équipes d'assistance et les officiers municipaux sont à votre écoute pour vous guider.
            </p>
          </div>

          <div className="lp-contact-grid">
            <div className="lp-contact-info-cards">
              <div className="lp-contact-card">
                <div className="lp-contact-icon-box">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="lp-contact-card-title">Numéro Vert Gratuit</h4>
                  <p className="lp-contact-card-desc">
                    Appel sans frais depuis le Sénégal :<br />
                    <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>800 00 22 22</strong>
                  </p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-icon-box">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="lp-contact-card-title">Support Électronique</h4>
                  <p className="lp-contact-card-desc">
                    Écrivez-nous à :<br />
                    <strong style={{ color: 'var(--lp-text-primary)' }}>support@seninnov.sn</strong>
                  </p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-icon-box">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="lp-contact-card-title">Direction Nationale</h4>
                  <p className="lp-contact-card-desc">
                    Sphères Ministérielles de Diamniadio, Dakar, République du Sénégal.
                  </p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-icon-box">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="lp-contact-card-title">Heures d'Ouverture</h4>
                  <p className="lp-contact-card-desc">
                    Guichet physique : Lun - Ven (08h00 - 17h00)<br />
                    Plateforme en ligne : <strong>24h/24 & 7j/7</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="lp-contact-form-wrap">
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--lp-text-primary)' }}>
                Envoyez-nous un message
              </h3>
              <p style={{ color: 'var(--lp-text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Remplissez ce formulaire et un conseiller administratif vous répondra sous 24h ouvrées.
              </p>

              {contactSubmitted && (
                <div className="lp-form-success-banner">
                  <CheckCircle2 size={22} />
                  <span>Votre message a été transmis avec succès. Merci de votre confiance !</span>
                </div>
              )}

              <form onSubmit={handleContactSubmit}>
                <div className="lp-form-row">
                  <div className="lp-form-group">
                    <label className="lp-form-label">Nom & Prénom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Ousmane Ba"
                      className="lp-form-input"
                      value={contactForm.nom}
                      onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                    />
                  </div>
                  <div className="lp-form-group">
                    <label className="lp-form-label">Adresse Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="ousmane@exemple.sn"
                      className="lp-form-input"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-form-group">
                    <label className="lp-form-label">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      className="lp-form-input"
                      value={contactForm.telephone}
                      onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                    />
                  </div>
                  <div className="lp-form-group">
                    <label className="lp-form-label">Commune ou Région</label>
                    <input
                      type="text"
                      placeholder="Ex : Pikine, Dakar, Thiès..."
                      className="lp-form-input"
                      value={contactForm.commune}
                      onChange={(e) => setContactForm({ ...contactForm, commune: e.target.value })}
                    />
                  </div>
                </div>

                <div className="lp-form-group">
                  <label className="lp-form-label">Objet de la demande</label>
                  <select
                    className="lp-form-select"
                    value={contactForm.sujet}
                    onChange={(e) => setContactForm({ ...contactForm, sujet: e.target.value })}
                  >
                    <option value="Renseignement sur une démarche">Renseignement sur une démarche</option>
                    <option value="Problème avec un acte ou QR code">Problème avec un acte ou QR code</option>
                    <option value="Demande de partenariat / Intégration">Demande de partenariat / Intégration</option>
                    <option value="Autre demande">Autre demande</option>
                  </select>
                </div>

                <div className="lp-form-group">
                  <label className="lp-form-label">Votre Message *</label>
                  <textarea
                    required
                    placeholder="Décrivez votre situation ou votre question avec précision..."
                    className="lp-form-textarea"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="lp-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={contactLoading}
                >
                  <Send size={18} />
                  <span>{contactLoading ? 'Envoi en cours...' : 'Envoyer mon Message'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          PIED DE PAGE (FOOTER)
          ==================================================================== */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div>
              <div className="lp-footer-brand-title">
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                />
                <span>SenInnov</span>
              </div>
              <p className="lp-footer-desc">
                Plateforme numérique officielle de modernisation de l'état civil au Sénégal.
                Développée dans le cadre du Hackathon DevTech pour rapprocher l'administration
                des citoyens.
              </p>
              <div className="lp-footer-motto">
                🇸🇳 Un Peuple — Un But — Une Foi
              </div>
            </div>

            <div>
              <h4 className="lp-footer-col-title">Actes Civils</h4>
              <ul className="lp-footer-links">
                <li><a href="#services" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'services')}>Extrait de Naissance</a></li>
                <li><a href="#services" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'services')}>Certificat de Mariage</a></li>
                <li><a href="#services" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'services')}>Certificat de Décès</a></li>
                <li><a href="#services" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'services')}>Certificat de Nationalité</a></li>
                <li><a href="#verification-qr" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'verification-qr')}>Authentification QR Code</a></li>
              </ul>
            </div>

            <div>
              <h4 className="lp-footer-col-title">Navigation</h4>
              <ul className="lp-footer-links">
                <li><a href="#accueil" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'accueil')}>Accueil</a></li>
                <li><a href="#services" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'services')}>Nos Services</a></li>
                <li><a href="#verification-qr" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'verification-qr')}>Vérification QR</a></li>
                <li><a href="#demarches" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'demarches')}>Comment ça marche</a></li>
                <li><a href="#apropos" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'apropos')}>À Propos</a></li>
                <li><a href="#contact" className="lp-footer-link" onClick={(e) => scrollToSection(e, 'contact')}>Contact & Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="lp-footer-col-title">Accès Professionnel</h4>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: '1.5' }}>
                Agents municipaux, officiers d'état civil et administrateurs de centres :
              </p>
              {user ? (
                <Link to="/dashboard" className="lp-btn-login" style={{ display: 'inline-flex' }}>
                  <span>Tableau de Bord</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/login" className="lp-btn-login" style={{ display: 'inline-flex' }}>
                  <Lock size={16} />
                  <span>Connexion</span>
                </Link>
              )}
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div>
              © 2026 SenInnov — République du Sénégal. Tous droits réservés.
            </div>
            <div className="lp-footer-legal-links">
              <a href="#apropos">Mentions Légales</a>
              <a href="#apropos">Protection des Données (CDP)</a>
              <a href="#contact">Accessibilité</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
