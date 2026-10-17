import psycopg2
import time as py_time
import cohere
from config.settings import settings

# Simple global cache for registry context
_registry_context_cache = None
_registry_context_cache_time = 0.0
CACHE_TTL = 300.0  # 5 minutes in seconds

def get_registry_context_from_db() -> str:
    global _registry_context_cache, _registry_context_cache_time
    now = py_time.time()
    if _registry_context_cache is not None and (now - _registry_context_cache_time) < CACHE_TTL:
        print("Using cached registry context")
        return _registry_context_cache

    try:
        if not settings.DATABASE_URL:
            raise Exception("DATABASE_URL not found in env")
        conn = psycopg2.connect(settings.DATABASE_URL)
        cur = conn.cursor()
        
        query = """
            SELECT 
                b.id AS bureau_id,
                b.nom AS bureau_nom,
                s.id AS service_id,
                s.nom AS service_nom,
                s.description AS service_description,
                a.id AS activite_id,
                a.nom AS activite_nom,
                a.prix AS activite_prix,
                a.delai_min_jours AS activite_delai_min,
                a.delai_max_jours AS activite_delai_max,
                a.presence_physique_requise AS activite_presence_physique,
                cd.label AS champ_label,
                cd.type_champ AS champ_type,
                cd.obligatoire AS champ_obligatoire
            FROM bureaux b
            JOIN services s ON s.bureau_id = b.id
            JOIN activites a ON a.service_id = s.id
            LEFT JOIN champs_dynamiques cd ON cd.activite_id = a.id AND cd.actif = true
            WHERE b.actif = true AND s.actif = true AND a.actif = true
            ORDER BY b.nom, s.nom, a.nom, cd.ordre;
        """
        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        if not rows:
            result_str = "Aucun service d'état civil n'est configuré pour le moment."
            _registry_context_cache = result_str
            _registry_context_cache_time = now
            return result_str
            
        catalog = {}
        for r in rows:
            b_id, b_nom, s_id, s_nom, s_desc, a_id, a_nom, a_prix, a_dmin, a_dmax, a_phys, c_lbl, c_type, c_req = r
            b_nom = b_nom.strip() if b_nom else ""
            s_nom = s_nom.strip() if s_nom else ""
            a_nom = a_nom.strip() if a_nom else ""
            if c_lbl:
                c_lbl = c_lbl.strip()
            
            if b_nom not in catalog:
                catalog[b_nom] = {}
            if s_nom not in catalog[b_nom]:
                catalog[b_nom][s_nom] = {
                    "description": s_desc,
                    "activities": {}
                }
            if a_nom not in catalog[b_nom][s_nom]["activities"]:
                catalog[b_nom][s_nom]["activities"][a_nom] = {
                    "id": a_id,
                    "service_id": s_id,
                    "bureau_id": b_id,
                    "prix": a_prix,
                    "delai_min": a_dmin,
                    "delai_max": a_dmax,
                    "presence_physique": a_phys,
                    "champs": []
                }
            if c_lbl:
                catalog[b_nom][s_nom]["activities"][a_nom]["champs"].append({
                    "label": c_lbl,
                    "type": c_type,
                    "obligatoire": c_req
                })
        
        lines = []
        for b_nom, services in catalog.items():
            lines.append(f"### Bureau : {b_nom}")
            for s_nom, s_data in services.items():
                lines.append(f"#### Service : {s_nom}")
                if s_data["description"]:
                    lines.append(f"Description du service : {s_data['description']}")
                for a_nom, a_data in s_data["activities"].items():
                    lines.append(f"- Démarche / Activité : {a_nom}")
                    lines.append(f"  - Lien de navigation : /demande/new?bureauId={a_data['bureau_id']}&preselectedServiceId={a_data['service_id']}&preselectedActivityId={a_data['id']}")
                    lines.append(f"  - Tarif / Prix : {a_data['prix']} FCFA")
                    lines.append(f"  - Délais de traitement : de {a_data['delai_min']} à {a_data['delai_max']} jours ouvrés")
                    physique_str = "Oui, présence physique obligatoire au centre" if a_data["presence_physique"] else "Non (démarche 100% en ligne)"
                    lines.append(f"  - Présence physique requise : {physique_str}")
                    
                    champs = a_data["champs"]
                    if champs:
                        champs_strs = []
                        for c in champs:
                            req_str = "(obligatoire)" if c["obligatoire"] else "(optionnel)"
                            champs_strs.append(f"{c['label']} {req_str}")
                        lines.append(f"  - État de configuration : Entièrement configuré et disponible en ligne pour soumission.")
                        lines.append(f"  - Informations / Pièces justificatives à fournir : {', '.join(champs_strs)}")
                    else:
                        lines.append("  - État de configuration : Non configuré ou en cours de configuration par l'administration (non disponible pour soumission en ligne pour le moment).")
                        lines.append("  - Informations / Pièces justificatives à fournir : Cette démarche n'a pas encore de champs ou de pièces justificatives configurés par l'administrateur.")
            lines.append("")
            
        result_str = "\n".join(lines)
        _registry_context_cache = result_str
        _registry_context_cache_time = now
        return result_str
    except Exception as e:
        print("Error pulling PostgreSQL context:", e)
        # Fallback to static context
        return (
            "### Bureau : État Civil\n"
            "#### Service : Copie d'acte de naissance\n"
            "- Démarche / Activité : Copie d'acte de naissance\n"
            "  - Tarif / Prix : 1000 FCFA\n"
            "  - Délais de traitement : de 1 à 2 jours ouvrés\n"
            "  - Présence physique requise : Non\n"
            "  - Informations / Pièces justificatives à fournir : Nom, Prénom, Date de naissance, Lieu de naissance, Numéro de registre de l'acte, Pièce d'identité (CNI) ou livret de famille.\n"
            "#### Service : Copie d'acte de mariage\n"
            "- Démarche / Activité : Copie d'acte de mariage\n"
            "  - Tarif / Prix : 1500 FCFA\n"
            "  - Délais de traitement : de 1 à 2 jours ouvrés\n"
            "  - Présence physique requise : Non\n"
            "  - Informations / Pièces justificatives à fournir : Identité des deux conjoints, date et numéro d'enregistrement du mariage, photocopie des CNI des deux époux.\n"
            "#### Service : Extrait d'acte de décès\n"
            "- Démarche / Activité : Extrait d'acte de décès\n"
            "  - Tarif / Prix : Gratuit ou 1000 FCFA selon la commune\n"
            "  - Délais de traitement : de 1 à 2 jours ouvrés\n"
            "  - Présence physique requise : Non\n"
            "  - Informations / Pièces justificatives à fournir : Identité du défunt, lieu et date de décès, certificat médical ou déclaration de décès."
        )

def generate_ai_response_cohere(user_message: str, history: list = None, context: dict = None, current_user: dict = None) -> str:
    if history is None:
        history = []
        
    try:
        co = cohere.Client(settings.COHERE_API_KEY)
        db_context = get_registry_context_from_db()
        
        # Build additional context string
        context_str = ""
        if current_user:
            role = current_user.get("role", "Non spécifié")
            user_id = current_user.get("id", "Non spécifié")
            sub = current_user.get("sub", "Non spécifié")
            context_str += f"- Utilisateur actuel : {sub} (ID: {user_id})\n- Rôle / Profil : {role}\n"
            
        if context:
            if "role" in context:
                context_str += f"- Rôle du pôle : {context['role']}\n"
            if "permissions" in context:
                context_str += f"- Permissions actives : {', '.join(context['permissions'])}\n"
            if "page" in context:
                context_str += f"- Page actuellement consultée : {context['page']}\n"
            if "stats" in context:
                stats = context["stats"]
                stats_str = ", ".join([f"{k}: {v}" for k, v in stats.items()])
                context_str += f"- Données / Statistiques du tableau de bord actuel : {stats_str}\n"
            if "additional_info" in context:
                context_str += f"- Informations complémentaires : {context['additional_info']}\n"

        SYSTEM_PROMPT_END = """

ATTENTION IMPORTANT (DEEP LINKING) :
Lorsqu'un utilisateur citoyen exprime la volonté d'effectuer une démarche précise, et que tu as identifié cette démarche dans le catalogue ci-dessus, tu DOIS absolument terminer ta réponse par un lien Markdown spécial au format exact suivant :
[Commencer la démarche](LIEN_DE_NAVIGATION)
(Remplace LIEN_DE_NAVIGATION par le chemin indiqué dans le contexte pour l'activité). 
Par exemple : [Commencer la démarche](/demande/new?bureauId=1&preselectedServiceId=2&preselectedActivityId=5)
Cela affichera un bouton interactif dans l'application permettant au citoyen de démarrer directement sa demande."""

        system_prompt = f"""Tu es "SenInnov", l'assistant virtuel officiel de la plateforme d'état civil (SenInnov).
Ton rôle est d'accompagner tous les utilisateurs de la plateforme (citoyens, agents de l'administration, maires, gestionnaires).

INFORMATIONS DE CONTEXTE SUR L'UTILISATEUR CONNECTÉ ET SON ÉCRAN :
{context_str}

RÈGLES DE COMPORTEMENT ET D'ASSISTANCE :
1. Tu dois toujours être poli, courtois et très professionnel. Tes réponses doivent être claires et structurées (utilise des puces ou du gras si nécessaire).
2. Pour les administrateurs et agents : Aide-les à naviguer, gérer le tableau de bord, analyser les statistiques, auditer les logs et configurer les services.
3. Pour les citoyens et usagers : Réponds à TOUTES leurs questions concernant l'application, les démarches d'état civil, les documents, les tarifs, les délais, et les pièces à fournir. Utilise les informations de contexte et les services configurés pour les guider pas à pas dans leurs demandes. Explique-leur comment procéder pour soumettre une demande, comment utiliser les fonctionnalités de l'application, et fournis-leur les informations pertinentes selon leur profil connecté.
4. Si l'utilisateur pose une question totalement HORS-SUJET par rapport à SenInnov, l'état civil ou les démarches administratives, refuse poliment d'y répondre.

CONTEXTE DES SERVICES ET DÉMARCHES CONFIGURÉS :
{db_context}
{SYSTEM_PROMPT_END}
"""

        res = co.chat(
            model="command-r-08-2024",
            message=user_message,
            chat_history=history,
            preamble=system_prompt
        )
        return res.text
    except Exception as e:
        print("Cohere calling error, falling back to local semantics:", e)
        return generate_ai_response(user_message)

def generate_ai_report_cohere(report_data: dict, current_user: dict) -> str:
    try:
        co = cohere.Client(settings.COHERE_API_KEY)
        
        username = current_user.get("sub", "Agent")
        role = current_user.get("role", "Non spécifié")
        
        stats = report_data.get("stats", {})
        start_date = report_data.get("startDate", "N/A")
        end_date = report_data.get("endDate", "N/A")
        activity_label = report_data.get("activityLabel", "Tous les types d'actes")
        
        total = stats.get('total', 0)
        valide = stats.get('valide', 0)
        en_attente = stats.get('en_attente', 0) + stats.get('signature', 0)
        rejete = stats.get('rejete', 0)
        
        # Calculate percentages safely
        valide_pct = round((valide / total) * 100, 1) if total > 0 else 0.0
        attente_pct = round((en_attente / total) * 100, 1) if total > 0 else 0.0
        rejete_pct = round((rejete / total) * 100, 1) if total > 0 else 0.0

        top_docs_list = report_data.get("topDocuments", [])
        performance_list = report_data.get("performance", [])
        
        top_docs_str = "\n".join([f"- {d.get('nom')}: {d.get('count')} demandes" for d in top_docs_list]) if top_docs_list else "Aucune donnée disponible"
        performance_str = "\n".join([f"- {p.get('nom')}: {p.get('count')} dossiers traités" for p in performance_list]) if performance_list else "Aucune donnée disponible"
        
        system_prompt = (
            "Tu es un Data Analyst expert (Analyste de Données) chevronné pour la plateforme SenInnov. "
            "Ton objectif est de fournir des rapports de performance extrêmement précis, clairs et actionnables. "
            "Pour garantir une vitesse de réponse ultra-rapide (très faible latence), écris de manière concise, directe "
            "et télégraphique, sans aucune fioriture (pas d'introductions, pas de transitions, pas de politesses)."
        )
        
        prompt = f"""Rédige un rapport d'analyse de performance pour la période du {start_date} au {end_date}.
Périmètre : {activity_label}
Généré par : {username} ({role})

DONNÉES DU PÉRIMITRE :
- Total des demandes : {total}
- Validées : {valide} ({valide_pct}%)
- En cours / En attente : {en_attente} ({attente_pct}%)
- Rejetées : {rejete} ({rejete_pct}%)

DOCUMENTS LES PLUS DEMANDÉS :
{top_docs_str}

PERFORMANCE DES ENTITÉS / AGENTS :
{performance_str}

INSTRUCTIONS DE CONCISION (CRITIQUES POUR LA VITESSE DE RÉPONSE) :
1. Débute immédiatement par le titre '# Rapport d'Analyse de Performance ({start_date} au {end_date})'. Aucun blabla.
2. Utilise des phrases ultra-courtes, directes, axées sur les chiffres et constats.
3. Règle pour les graphiques ASCII : Limite la longueur maximale des barres à 10 caractères (ex: `█████ 50%` ou `▇▇▇ 3 dossiers`) pour accélérer considérablement la vitesse de génération de l'API.

SECTIONS REQUISES :
   
   ## 📊 Vue d'Ensemble & Indicateurs Clés (KPIs)
   Présente un tableau Markdown récapitulant les chiffres (Statut | Volume | Pourcentage). Calcule le taux de validation globale et le taux de rejet.
   
   ## 📈 Analyse de l'Activité & Graphique ASCII
   Représente la répartition des dossiers (Validés vs En cours vs Rejetés) avec un mini-graphique à barres ASCII horizontal simple. 
   Analyse : 1 constat direct (1 phrase) sur l'efficacité globale et les rejets.
   
   ## 📄 Palmarès des Actes les plus Demandés
   Affiche les actes les plus demandés sous forme de mini-graphique à barres ASCII horizontal.
   Analyse : 1 constat direct (1 phrase) sur l'impact opérationnel.
   
   ## 🏆 Classement d'Efficacité
   Représente les agents/entités les plus performants avec un graphique à barres ASCII horizontal.
   Analyse : 1 constat direct (1 phrase) de performance.
   
   ## 🔍 Diagnostic & Recommandations du Data Analyst
   Formule 3 recommandations concrètes, hautement stratégiques et basées sur ces chiffres pour accélérer durablement le traitement (ex. automatisation des goulots d'étranglement, formation ciblée des agents, simplification des pièces requises). Chaque recommandation doit faire maximum 2 phrases et aller droit au but.
   
   ## 🏁 Conclusion & Perspectives
   Conclusion synthétique en 2 phrases.
"""

        res = co.chat(
            model="command-r-08-2024",
            message=prompt,
            preamble=system_prompt
        )
        return res.text
    except Exception as e:
        print("Cohere report generation error:", e)
        return f"Erreur lors de la génération du rapport par l'IA : {str(e)}"

def generate_ai_response(user_message: str) -> str:
    msg = user_message.lower()
    if "naissance" in msg:
        return "Pour obtenir une **copie d'acte de naissance** sur SenInnov..."
    return "Je comprends votre demande. Je suis programmé pour vous renseigner sur les démarches administratives."
