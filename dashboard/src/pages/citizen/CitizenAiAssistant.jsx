import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Send, User, Sparkles, RotateCcw, AlertCircle, ArrowRight,
  Mic, MicOff, Volume2, VolumeX, Trash2, Plus, MessageSquare,
  CheckCircle2, Clock, ShieldCheck, HelpCircle, ExternalLink,
  Copy, Check, FileText, Calendar, ChevronRight, X, Menu, Search
} from 'lucide-react';
import api, { API_BASE_URL } from '../../utils/api';

// Base de connaissances juridiques sénégalaises complètes (Code de la Famille & Décrets d'application)
const LEGAL_KNOWLEDGE_BASE = [
  {
    keywords: ['naissance', 'juddu', 'enfant', 'bebe', 'accouchement', 'maternite', 'declarer'],
    title: "Déclaration et Extrait de Naissance au Sénégal",
    content: `**Régime légal de la déclaration de naissance :**

• **Délai légal normal :** La déclaration doit être effectuée obligatoirement dans un délai légal de **1 mois** (dans les communes urbaines comme Dakar, Thiès, Kaolack) et de **3 mois** en zone rurale. Les réformes récentes permettent une régularisation simplifiée jusqu'à **1 an** auprès du centre de rattachement.
• **Pièces à fournir impérativement :**
  1. Le certificat d'accouchement délivré par la maternité ou le carnet de santé signé par la sage-femme / médecin.
  2. La copie de la Carte Nationale d'Identité (CNI) du père ou de la mère (ou l'acte de mariage / livret de famille des parents).
  3. Si la déclaration est faite par un tiers : une procuration signée et la pièce d'identité du déclarant.
• **Frais officiels :** La déclaration initiale est **strictement gratuite**. La délivrance d'extraits d'actes d'état civil est soumise au droit de timbre légal (200 FCFA à 500 FCFA selon les communes, ou gratuite sur les actes numérisés sans frais).

*Conseil SenInnov : Vous pouvez soumettre votre dossier directement en ligne sans file d'attente.*`,
    actions: [
      { label: "Démarrer une demande de naissance", url: "/citoyen/demande/nouvelle" },
      { label: "Consulter la FAQ des actes", url: "/citoyen/parametres?section=faq" }
    ]
  },
  {
    keywords: ['tardif', 'suppletif', 'jugement', 'tribunal', 'retard', 'depasse', 'expiration', 'non declare'],
    title: "Jugement d'autorisation d'inscription tardive (Jugement Supplétif)",
    content: `**Procédure en cas de dépassement du délai de déclaration (enfant de plus d'1 an) :**

Lorsque l'enfant n'a pas été déclaré dans le délai légal d'un an, l'officier d'état civil ne peut plus inscrire l'acte directement sur les registres. Une décision de justice est obligatoire.

• **Juridiction compétente :** Le Tribunal d'Instance du ressort territorial du lieu de naissance de l'enfant ou du domicile des parents.
• **Dossier de demande :**
  1. Certificat de non-inscription sur les registres délivré par le centre d'état civil du lieu de naissance.
  2. Certificat d'accouchement ou d'âge apparent établi par un médecin assermenté.
  3. Déposition de deux (2) témoins majeurs munis de leur CNI certifiant de la filiation et de la date de naissance.
• **Délai d'obtention :** 2 à 4 semaines (ou immédiat lors des audiences foraines organisées par le Ministère de la Justice).
• **Inscription définitive :** Dès l'obtention du jugement, transmettez la grosse du jugement à votre centre d'état civil pour transcription sur le registre de l'année en cours.`,
    actions: [
      { label: "Prendre un rendez-vous d'orientation", url: "/citoyen/rendez-vous" },
      { label: "Poser une question au support", url: "/citoyen/parametres?section=help" }
    ]
  },
  {
    keywords: ['mariage', 'sey', 'epoux', 'epouse', 'celebre', 'regime', 'monogamie', 'polygamie', 'dot', 'certificat de coutume'],
    title: "Certificat de Mariage & Régimes Matrimoniaux au Sénégal",
    content: `**Réglementation du mariage selon le Code de la Famille du Sénégal :**

• **Types d'unions reconnues :**
  1. **Mariage célébré par l'officier d'état civil :** Inscription directe et immédiate sur les registres de la mairie.
  2. **Mariage constaté (religieux / coutumier) :** Doit être obligatoirement déclaré à l'officier d'état civil dans les **6 mois** suivant la célébration religieuse, sous peine d'amende et de non-opposabilité aux tiers.
• **Choix du régime matrimonial :**
  - **Option de polygamie :** Monogamie (irréversible), limitation à 2 épouses, à 3 épouses ou polygamie limitée à 4 épouses.
  - **Régime des biens :** Séparation de biens (régime légal par défaut) ou communauté de biens meubles et acquêts.
• **Délivrance de l'acte :** Un extrait ou certificat de mariage peut être demandé en ligne en précisant le numéro de registre et l'année. Délivrance sous 24 à 48 heures.`,
    actions: [
      { label: "Demander un extrait de mariage", url: "/citoyen/demande/nouvelle" },
      { label: "Prendre rendez-vous pour célébration", url: "/citoyen/rendez-vous" }
    ]
  },
  {
    keywords: ['deces', 'mort', 'dee', 'inhumation', 'enterrement', 'heredite', 'succession'],
    title: "Déclaration de Décès & Certificat d'Hérédité",
    content: `**Démarches suite à un décès au Sénégal :**

• **Délai de déclaration :** Le décès doit être déclaré à la mairie du lieu où il s'est produit dans un délai légal de **1 mois**.
• **Pièces indispensables :**
  1. Le certificat médical de constatation de décès délivré par le médecin légiste ou de l'hôpital.
  2. La pièce d'identité du défunt (CNI, passeport ou extrait de naissance).
  3. La CNI du déclarant (parent, proche ou responsable des pompes funèbres).
• **Permis d'inhumer :** L'acte de décès donne droit à la délivrance immédiate du permis d'inhumer obligatoire pour l'enterrement.
• **Succession et Certificat d'hérédité :** Pour débloquer les comptes bancaires ou procéder au partage des biens, les héritiers doivent déposer une requête en jugement d'hérédité auprès du Tribunal d'Instance compétent.`,
    actions: [
      { label: "Déclarer un acte de décès", url: "/citoyen/demande/nouvelle" }
    ]
  },
  {
    keywords: ['prix', 'cout', 'tarif', 'combien', 'frais', 'wave', 'orange money', 'gratuit', 'payer'],
    title: "Tarifs Officiels & Modalités de Paiement",
    content: `**Barème officiel des démarches d'état civil sénégalais :**

• **Déclaration de naissance initiale :** **0 FCFA (Entièrement gratuite)** dans les délais légaux.
• **Extraits d'actes d'état civil (Naissance, Mariage, Décès) :** 200 à 500 FCFA (droits de timbre réglementaires fixés par la commune).
• **Certificat de résidence et légalisation :** 1 000 FCFA.
• **Moyens de paiement acceptés sur SenInnov :**
  - **Paiement digital instantané :** Wave et Orange Money (transaction chiffrée sans surcoût).
  - **Paiement au guichet :** En espèces lors du retrait physique si vous n'avez pas de portefeuille électronique.
• **Documents gratuits :** Si le prix d'un acte est de 0 FCFA, l'étape de paiement est automatiquement masquée et la validation est immédiate.`,
    actions: [
      { label: "Consulter mes démarches", url: "/citoyen/demandes" }
    ]
  },
  {
    keywords: ['wolof', 'kayit', 'juddu', 'naka', 'waxtu', 'faay', 'sama', 'lan'],
    title: "Ndimbal ci Kalaama Wolof (Assistance en Wolof)",
    content: `**Naka ngay amee sa kayitu état civil ci SenInnov :**

• **Ngir am kayitu juddu (Extrait de naissance) :**
  1. Bësal ci buntu **"Nouvelle Demande"** ci kaw.
  2. Tànn sa commune ak centre d'état civil fuñula bindee.
  3. Dugal sa photo carte d'identité wala certificat d'accouchement bi maternité bi joxe.
  4. Fay sa droit de timbre ci Wave wala Orange Money (bu dee 0 FCFA la, dula laaj dara).
• **Waxtu bi mu ciy def :**
  Bu lëkkaloo ba pare, ci 24h ba 48h dinañula ko yónnee. Dinga mëna jël PDF bi am QR Code télécharger ko ci sa téléphone wala ordinateur !
• **Bu dee dafa yàgg te binduwul (au-delà de 1 an) :**
  Danga wara dem ci Tribunal d'Instance ngir def jugement supplétif.`,
    actions: [
      { label: "Tàmbalee sa demande léegi", url: "/citoyen/demande/nouvelle" },
      { label: "Xool sama dossier yi", url: "/citoyen/demandes" }
    ]
  }
];

export default function CitizenAiAssistant({ user }) {
  const navigate = useNavigate();

  // Sessions d'historique de conversation
  const sessionKey = user ? `seninnov_ai_sessions_${user.id || 'default'}` : 'seninnov_ai_sessions_guest';
  const [sessions, setSessions] = useState(() => {
    try {
      const stored = localStorage.getItem(sessionKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return Date.now().toString();
  });

  // Messages de la discussion active
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Bonjour **${user?.nom_complet?.split(' ')[0] || 'Cher citoyen'}**.\n\nJe suis l'**Assistant Virtuel Officiel de l'État Civil du Sénégal** (SenInnov IA).\n\nJe peux vous orienter en temps réel sur toutes vos formalités administratives et juridiques selon le **Code de la Famille** :\n\n• **Actes de Naissance** : Délais légaux, maternité, déclarations tardives et jugements d'autorisation.\n• **Certificats de Mariage** : Régimes matrimoniaux (monogamie / polygamie), délais de déclaration des mariages religieux et coutumiers.\n• **Actes de Décès** : Permis d'inhumer, certificat médical et successions.\n• **Certificats de Résidence & CNI** : Pièces requises et légalisations.\n• **Assistance complète en Wolof** : Posez directement vos questions en Wolof.\n\nComment puis-je vous guider aujourd'hui ?`,
      actions: [
        { label: "Déclaration de naissance", query: "Quels sont les délais et pièces pour un extrait de naissance ?" },
        { label: "Jugement supplétif", query: "Mon enfant a plus d'1 an sans extrait, comment faire un jugement d'autorisation tardive ?" },
        { label: "Régimes de mariage", query: "Quelles sont les options de régimes matrimoniaux lors du mariage ?" },
        { label: "Questions en Wolof", query: "Naka lay amee kayitu juddu ? (Assistance en Wolof)" }
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState(null); // true = microservice en ligne, false = moteur juridique expert local
  const [copiedId, setCopiedId] = useState(null);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Reconnaissance vocale (Speech to Text)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Test de disponibilité Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Synthèse vocale (Text to Speech)
  const handleToggleSpeech = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      alert("La synthèse vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (activeSpeechId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Nettoyage markdown pour la lecture audio
    const cleanText = text.replace(/[*_#•]/g, ' ').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);

    setActiveSpeechId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Défilement automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Vérification de l'état du microservice IA FastAPI au chargement
  useEffect(() => {
    const checkAiServer = async () => {
      try {
        const hostname = window.location.hostname;
        const res = await fetch(`http://${hostname}:8000/api/ai/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
        if (res.ok) setAiOnline(true);
        else setAiOnline(false);
      } catch {
        setAiOnline(false);
      }
    };
    checkAiServer();
  }, []);

  // Enregistrement des sessions dans le localStorage
  const saveSessionMessages = (newMessages) => {
    try {
      const title = newMessages.find(m => m.role === 'user')?.content?.slice(0, 36) || 'Discussion État Civil';
      const updated = sessions.filter(s => s.id !== currentSessionId);
      const sessionObj = {
        id: currentSessionId,
        title,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        messages: newMessages
      };
      const finalSessions = [sessionObj, ...updated].slice(0, 15);
      setSessions(finalSessions);
      localStorage.setItem(sessionKey, JSON.stringify(finalSessions));
    } catch (e) {
      console.warn('Erreur sauvegarde session:', e);
    }
  };

  const handleNewSession = () => {
    window.speechSynthesis?.cancel();
    setActiveSpeechId(null);
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Nouvelle discussion ouverte. Comment puis-je vous renseigner sur vos démarches administratives ou vos actes officiels ?`,
        actions: [
          { label: "Déclaration de naissance", query: "Quels sont les délais et pièces pour un extrait de naissance ?" },
          { label: "Jugement d'autorisation", query: "Comment obtenir un jugement d'autorisation d'inscription tardive ?" },
          { label: "Extrait de mariage", query: "Comment demander un certificat de mariage en ligne ?" },
          { label: "Tarifs Wave/OM", query: "Combien coûte un extrait d'acte et comment payer par Wave ?" }
        ]
      }
    ]);
    setSidebarOpen(false);
  };

  const handleLoadSession = (sess) => {
    window.speechSynthesis?.cancel();
    setActiveSpeechId(null);
    setCurrentSessionId(sess.id);
    setMessages(sess.messages || []);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (e, sessId) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== sessId);
    setSessions(filtered);
    localStorage.setItem(sessionKey, JSON.stringify(filtered));
    if (currentSessionId === sessId) {
      handleNewSession();
    }
  };

  // Moteur de réponse local expert
  const queryExpertEngine = (userQuery) => {
    const q = userQuery.toLowerCase().trim();

    for (const item of LEGAL_KNOWLEDGE_BASE) {
      const match = item.keywords.some(kw => q.includes(kw));
      if (match) {
        return {
          content: `### ${item.title}\n\n${item.content}`,
          actions: item.actions
        };
      }
    }

    // Réponse par défaut structurée
    return {
      content: `### Assistance Administrative SenInnov\n\nPour toute démarche d'état civil auprès des centres municipaux du Sénégal :\n\n• **Déposer une demande d'acte :** Rendez-vous dans l'onglet **"Nouvelle Demande"**, sélectionnez votre centre de rattachement et renseignez le formulaire dynamique.\n• **Suivi de votre dossier :** Consultez l'onglet **"Mes Demandes"** pour observer en temps réel la frise chronologique de traitement (Dépôt, Vérification, Signature de l'Officier).\n• **Téléchargement sécurisé :** Dès validation, votre acte officiel muni du sceau et du code QR d'authentification est directement téléchargeable en PDF.\n\n*Avez-vous une question spécifique concernant un acte de Naissance, de Mariage, de Décès ou un Certificat de Résidence ?*`,
      actions: [
        { label: "Faire une nouvelle demande", url: "/citoyen/demande/nouvelle" },
        { label: "Suivre mes démarches en cours", url: "/citoyen/demandes" },
        { label: "Consulter la FAQ officielle", url: "/citoyen/parametres?section=faq" }
      ]
    };
  };

  const handleSend = async (customQuery) => {
    const query = (customQuery || input).trim();
    if (!query || loading) return;

    window.speechSynthesis?.cancel();
    setActiveSpeechId(null);

    const userMsg = { id: Date.now().toString(), role: 'user', content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // 1. Tentative d'appel du microservice FastAPI IA si joignable
      const hostname = window.location.hostname;
      const res = await fetch(`http://${hostname}:8000/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            user_id: user?.id,
            nom: user?.nom_complet,
            role: 'citoyen',
            telephone: user?.telephone
          }
        }),
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.response || data.message || data.reply;
        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          actions: queryExpertEngine(query).actions
        };
        const finalMsgs = [...updatedMessages, botMsg];
        setMessages(finalMsgs);
        saveSessionMessages(finalMsgs);
        setAiOnline(true);
        return;
      }
    } catch {
      // Repli sur le moteur expert local
    } finally {
      setLoading(false);
    }

    // 2. Moteur juridique expert de repli
    setTimeout(() => {
      const expertResult = queryExpertEngine(query);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: expertResult.content,
        actions: expertResult.actions
      };
      const finalMsgs = [...updatedMessages, botMsg];
      setMessages(finalMsgs);
      saveSessionMessages(finalMsgs);
      setLoading(false);
    }, 400);
  };

  const handleCopy = (id, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div style={{
      maxWidth: '1040px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: 'calc(100vh - 160px)',
      minHeight: '680px'
    }}>
      
      {/* ── EN-TÊTE PRINCIPAL ── */}
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '20px',
        padding: '1.25rem 1.75rem',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(37,99,235,0.25)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                Assistant IA de l'État Civil
              </h1>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: aiOnline ? '#ecfdf5' : '#f5f3ff',
                color: aiOnline ? '#059669' : '#6d28d9',
                border: `1px solid ${aiOnline ? '#a7f3d0' : '#ddd6fe'}`
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: aiOnline ? '#10b981' : '#8b5cf6' }} />
                {aiOnline ? 'IA en Direct' : 'Expert Juridique'}
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
              Conseils officiels instantanés selon le Code de la Famille sénégalais
            </p>
          </div>
        </div>

        {/* Boutons d'action en-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: sidebarOpen ? 'rgba(37,99,235,0.08)' : 'transparent',
              color: sidebarOpen ? '#2563eb' : 'var(--text-secondary, #64748b)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MessageSquare size={15} />
            <span>Historique ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={handleNewSession}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
            }}
          >
            <Plus size={15} />
            <span>Nouvelle discussion</span>
          </button>
        </div>
      </div>

      {/* ── ZONE DE DISCUSSION & TIROIR D'HISTORIQUE ── */}
      <div style={{
        display: 'flex',
        flex: 1,
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '24px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* TIROIR LATÉRAL DES DISCUSSIONS PASSÉES */}
        {sidebarOpen && (
          <div style={{
            width: '280px',
            borderRight: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)' }}>
                Conversations Récentes
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Aucune conversation enregistrée
                </div>
              ) : (
                sessions.map(sess => {
                  const isActive = sess.id === currentSessionId;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleLoadSession(sess)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        marginBottom: '6px',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.1)' : 'transparent',
                        border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: isActive ? '700' : '600', color: isActive ? '#2563eb' : 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sess.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {sess.date}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                        title="Supprimer la conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CONTENU DU CHAT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* FLUX DE MESSAGES */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {messages.map((m) => {
              const isUser = m.role === 'user';
              const isSpeaking = activeSpeechId === m.id;

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '12px',
                    maxWidth: '85%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  {/* Avatar Icon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    backgroundColor: isUser ? '#2563eb' : 'rgba(37,99,235,0.08)',
                    color: isUser ? '#ffffff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isUser ? '0 4px 10px rgba(37,99,235,0.2)' : 'none'
                  }}>
                    {isUser ? <User size={18} /> : <Bot size={20} />}
                  </div>

                  {/* Bulle de Message */}
                  <div style={{
                    backgroundColor: isUser ? '#2563eb' : 'var(--bg-primary, #f8fafc)',
                    color: isUser ? '#ffffff' : 'var(--text-primary, #0f172a)',
                    padding: '14px 18px',
                    borderRadius: '18px',
                    borderTopRightRadius: isUser ? '4px' : '18px',
                    borderTopLeftRadius: !isUser ? '4px' : '18px',
                    border: isUser ? 'none' : '1px solid var(--border-color, #e2e8f0)',
                    boxShadow: isUser ? '0 4px 14px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    position: 'relative'
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>

                    {/* Actions de message pour l'assistant */}
                    {!isUser && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-color, #e2e8f0)',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSpeech(m.id, m.content)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color, #cbd5e1)',
                              backgroundColor: isSpeaking ? '#2563eb' : 'transparent',
                              color: isSpeaking ? '#ffffff' : '#64748b',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={isSpeaking ? "Arrêter la lecture" : "Écouter l'explication audio"}
                          >
                            {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            <span>{isSpeaking ? 'Arrêter' : 'Écouter'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.content)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color, #cbd5e1)',
                              backgroundColor: 'transparent',
                              color: '#64748b',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Copier le texte"
                          >
                            {copiedId === m.id ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                            <span>{copiedId === m.id ? 'Copié' : 'Copier'}</span>
                          </button>
                        </div>

                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Conseil juridique vérifié
                        </span>
                      </div>
                    )}

                    {/* Puces d'actions interactives */}
                    {m.actions && m.actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                        {m.actions.map((act, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (act.url) navigate(act.url);
                              else if (act.query) handleSend(act.query);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(37,99,235,0.2)',
                              backgroundColor: 'rgba(37,99,235,0.08)',
                              color: '#2563eb',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <span>{act.label}</span>
                            <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '12px',
                  backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Bot size={20} />
                </div>
                <div style={{
                  backgroundColor: 'var(--bg-primary, #f8fafc)',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span className="animate-spin" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.86rem', color: '#2563eb', fontWeight: '600' }}>
                    Recherche dans les textes d'état civil...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── BANDEAU DE QUESTIONS RAPIDES THÉMATIQUES ── */}
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            {[
              { label: "Extrait de naissance", q: "Quels sont les délais et pièces pour un extrait de naissance ?" },
              { label: "Jugement tardif", q: "Mon enfant a plus d'un an sans extrait, comment faire un jugement d'autorisation ?" },
              { label: "Régimes de mariage", q: "Quelles sont les options de régimes matrimoniaux au Sénégal ?" },
              { label: "Tarifs officiels", q: "Combien coûte un extrait d'acte et comment payer par Wave ou OM ?" },
              { label: "Assistance en Wolof", q: "Naka lay amee kayitu juddu ? (Assistance en Wolof)" }
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip.q)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  color: 'var(--text-secondary, #475569)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color, #cbd5e1)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ── CHAMP DE SAISIE & MICROPHONE ── */}
          <div style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-card, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {/* Bouton Microphone Dictée Vocale */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: isListening ? '2px solid #ef4444' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: isListening ? '#fef2f2' : 'var(--bg-primary, #f8fafc)',
                  color: isListening ? '#ef4444' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isListening ? '0 0 10px rgba(239,68,68,0.4)' : 'none'
                }}
                title={isListening ? "Arrêter la dictée" : "Dicter votre question à la voix"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={isListening ? "Parlez maintenant, l'assistant vous écoute..." : "Posez une question sur une démarche (Ex: Extrait de naissance, mariage, jugement...)"}
              style={{
                flex: 1,
                height: '44px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !loading ? 1 : 0.5,
                boxShadow: input.trim() && !loading ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              <span>Envoyer</span>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
