import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import * as Speech from 'expo-speech';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { getApiUrl } from '../services/apiClient';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type NavAction =
  | { type: 'navigate'; route: string; label: string; announce: string }
  | { type: 'scroll'; direction: 'up' | 'down'; announce: string }
  | { type: 'reply'; announce: string }
  | null;

export interface VoiceNavigatorOptions {
  scrollRef?: React.RefObject<any>;
  context?: Record<string, any>;
}

// ─────────────────────────────────────────────
// Dynamic AI API IP resolution
// ─────────────────────────────────────────────
const getAiApiBase = () => {
  try {
    const mainApi = getApiUrl();
    const match = mainApi.match(/http:\/\/([^:]+)/);
    if (match && match[1]) {
      return `http://${match[1]}:18000/api/ai`;
    }
  } catch (_) {}
  const hostUri = Constants.expoConfig?.hostUri;
  const ip = hostUri ? hostUri.split(':')[0] : '192.168.34.27';
  return `http://${ip}:18000/api/ai`;
};

// ─────────────────────────────────────────────
// Local intent detection — no network needed
// ─────────────────────────────────────────────
const INTENT_MAP: Array<{ patterns: string[]; action: NavAction }> = [
  {
    patterns: ['accueil', 'tableau de bord', 'page principale', 'home', 'retour accueil'],
    action: { type: 'navigate', route: '/(tabs)', label: 'Accueil', announce: "Je vous emmène sur la page d'accueil." },
  },
  {
    patterns: ['mes demandes', 'historique', 'demandes', 'suivi', 'voir mes demandes', 'mes dossiers'],
    action: { type: 'navigate', route: '/(tabs)/history', label: 'Mes demandes', announce: 'Voici votre historique de demandes.' },
  },
  {
    patterns: ['rendez-vous', 'rdv', 'prendre rendez-vous', 'mes rendez-vous', 'agenda', 'calendrier'],
    action: { type: 'navigate', route: '/(tabs)/rendez-vous', label: 'Rendez-vous', announce: 'Je vous ouvre la page des rendez-vous.' },
  },
  {
    patterns: ['profil', 'mon profil', 'parametres', 'reglages', 'settings', 'compte', 'mes informations'],
    action: { type: 'navigate', route: '/(tabs)/profile', label: 'Profil', announce: 'Voici votre profil.' },
  },
  {
    patterns: ['assistant', 'aide', 'chatbot', 'question', 'ia', 'intelligence'],
    action: { type: 'navigate', route: '/ai-assistant', label: 'Assistant IA', announce: "Je vous ouvre l'assistant SenInnov." },
  },
  {
    patterns: ['nouvelle demande', 'faire une demande', 'demarche', 'soumettre', 'demander un acte', 'nouvel acte'],
    action: { type: 'navigate', route: '/demande/new', label: 'Nouvelle demande', announce: 'Je vous ouvre le formulaire de demande.' },
  },
  {
    patterns: ['notifications', 'alertes', 'voir notifications'],
    action: { type: 'navigate', route: '/notifications', label: 'Notifications', announce: 'Voici vos notifications.' },
  },
  {
    patterns: ['descends', 'defiler', 'bas', 'scroll bas', 'voir la suite', 'plus bas'],
    action: { type: 'scroll', direction: 'down', announce: 'Je fais defiler la page vers le bas.' },
  },
  {
    patterns: ['remonte', 'en haut', 'scroll haut', 'retour en haut', 'haut de la page'],
    action: { type: 'scroll', direction: 'up', announce: 'Je remonte en haut de la page.' },
  },
];

function detectLocalIntent(text: string): NavAction {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const entry of INTENT_MAP) {
    for (const pattern of entry.patterns) {
      const normPattern = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normPattern)) return entry.action;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// TTS helper
// ─────────────────────────────────────────────
function speakFr(text: string, onDone?: () => void) {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.95,
      onDone,
      onStopped: onDone,
      onError: onDone,
    });
  } catch (_) {
    onDone?.();
  }
}

// ─────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────
export function useVoiceNavigator(options: VoiceNavigatorOptions = {}) {
  const router = useRouter();
  const { scrollRef, context } = options;

  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<NavAction>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Execute action ───────────────────────────
  const executeAction = useCallback(
    (action: NavAction): boolean => {
      if (!action) return false;
      setLastAction(action);

      if (action.type === 'navigate') {
        speakFr(action.announce, () => {
          setState('idle');
          try { router.push(action.route as any); } catch (_) {}
        });
        setState('speaking');
        return true;
      }

      if (action.type === 'scroll') {
        speakFr(action.announce, () => setState('idle'));
        setState('speaking');
        // Broadcast to whatever screen is currently active
        DeviceEventEmitter.emit('VOICE_SCROLL', { direction: action.direction });
        if (scrollRef?.current) {
          try {
            scrollRef.current.scrollTo({
              y: action.direction === 'down' ? 999999 : 0,
              animated: true,
            });
          } catch (_) {}
        }
        return true;
      }

      return false;
    },
    [router, scrollRef]
  );

  // ── Transcribe audio + process ────────────────
  const transcribeAndProcess = useCallback(
    async (uri: string) => {
      setState('processing');
      try {
        const token =
          (await SecureStore.getItemAsync('auth_token')) ||
          (await SecureStore.getItemAsync('auth_cached_token'));

        if (!token) {
          speakFr("Vous devez etre connecte pour utiliser la navigation vocale.", () => setState('idle'));
          setState('speaking');
          return;
        }

        const aiBase = getAiApiBase();

        // Ensure session exists
        if (!sessionIdRef.current) {
          const res = await fetch(`${aiBase}/sessions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Navigation vocale' }),
          });
          if (res.ok) {
            const data = await res.json();
            sessionIdRef.current = data.id;
          }
        }

        if (!sessionIdRef.current) {
          speakFr("Impossible d'initialiser la session.", () => setState('idle'));
          setState('speaking');
          return;
        }

        // Upload audio → Whisper transcription + IA reply
        const uploadResult = await FileSystem.uploadAsync(
          `${aiBase}/sessions/${sessionIdRef.current}/voice`,
          uri,
          {
            fieldName: 'audio',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: { Authorization: `Bearer ${token}` },
            mimeType: 'audio/m4a',
          }
        );

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          const resData = JSON.parse(uploadResult.body);
          const transcribedText: string = resData?.transcription || '';
          const aiReply: string = resData?.content || '';
          setTranscription(transcribedText);

          // 1. Direct intent detection on transcribed text
          if (transcribedText) {
            const intentFromUser = detectLocalIntent(transcribedText);
            if (intentFromUser && (intentFromUser.type === 'navigate' || intentFromUser.type === 'scroll')) {
              executeAction(intentFromUser);
              return;
            }
          }

          // 2. Fallback intent detection on AI reply
          if (aiReply) {
            const intentFromReply = detectLocalIntent(aiReply);
            if (intentFromReply && (intentFromReply.type === 'navigate' || intentFromReply.type === 'scroll')) {
              executeAction(intentFromReply);
              return;
            }
          }

          // 3. Otherwise read AI reply aloud
          const clean = (aiReply || transcribedText)
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[*_#`~]/g, '')
            .replace(/^[-•*]\s+/gm, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);

          if (clean) {
            setState('speaking');
            setLastAction({ type: 'reply', announce: clean });
            speakFr(clean, () => setState('idle'));
          } else {
            setState('idle');
          }
        } else {
          throw new Error(`Status ${uploadResult.status}`);
        }
      } catch (e) {
        speakFr('Une erreur s\'est produite. Veuillez reessayer.', () => setState('idle'));
        setState('speaking');
        setErrorMsg('Erreur de traitement vocal');
      }
    },
    [executeAction]
  );

  // ── Start recording ──────────────────────────
  const startListening = useCallback(async () => {
    try {
      setErrorMsg(null);
      setTranscription(null);
      setLastAction(null);
      Speech.stop();

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        speakFr('Vous devez autoriser le microphone.', () => setState('idle'));
        setState('speaking');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setState('recording');
    } catch (e) {
      console.warn('[VoiceNavigator] Start recording error:', e);
      setErrorMsg("Impossible de demarrer l'enregistrement");
      setState('idle');
    }
  }, [audioRecorder]);

  // ── Stop recording ───────────────────────────
  const stopListening = useCallback(async () => {
    if (state !== 'recording') return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        await transcribeAndProcess(uri);
      } else {
        setState('idle');
      }
    } catch (e) {
      setState('idle');
    }
  }, [state, audioRecorder, transcribeAndProcess]);

  // ── Cancel ───────────────────────────────────
  const cancel = useCallback(async () => {
    try {
      if (state === 'recording') await audioRecorder.stop();
      Speech.stop();
    } catch (_) {}
    setState('idle');
    setTranscription(null);
    setLastAction(null);
    setErrorMsg(null);
  }, [state, audioRecorder]);

  return {
    state,
    transcription,
    lastAction,
    errorMsg,
    startListening,
    stopListening,
    cancel,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    isSpeaking: state === 'speaking',
    isIdle: state === 'idle',
  };
}

/**
 * Hook to be used in any screen that contains a ScrollView or FlatList.
 * Automatically listens to 'VOICE_SCROLL' and scrolls up or down smoothly.
 */
export function useVoiceScroll(scrollRef: React.RefObject<any>) {
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('VOICE_SCROLL', (data: { direction: 'up' | 'down' }) => {
      if (!scrollRef?.current) return;
      try {
        if (data.direction === 'down') {
          if (scrollRef.current.scrollToEnd) {
            scrollRef.current.scrollToEnd({ animated: true });
          } else if (scrollRef.current.scrollTo) {
            scrollRef.current.scrollTo({ y: 1500, animated: true });
          }
        } else {
          if (scrollRef.current.scrollToOffset) {
            scrollRef.current.scrollToOffset({ offset: 0, animated: true });
          } else if (scrollRef.current.scrollTo) {
            scrollRef.current.scrollTo({ y: 0, animated: true });
          }
        }
      } catch (_) {}
    });

    return () => {
      sub.remove();
    };
  }, [scrollRef]);
}
