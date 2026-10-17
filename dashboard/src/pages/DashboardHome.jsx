import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { Landmark, Users, Globe, Map, FileText, CheckCircle, Clock, AlertTriangle, Briefcase, Activity, TrendingUp, TrendingDown, Eye, Search, Scan, Calendar, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ComposedChart } from 'recharts';


export default function DashboardHome({ token, currentUser }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timeFilter, setTimeFilter] = useState('month');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  const [activities, setActivities] = useState([]);
  const [actLoading, setActLoading] = useState(false);

  const [roleChartsData, setRoleChartsData] = useState({});
  const [roleChartsLoading, setRoleChartsLoading] = useState(true);

  // Period state for temporal analysis filter
  const [period, setPeriod] = useState('month'); // 'today' | 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Agent Dashboard specific state
  const [showAgentStats, setShowAgentStats] = useState(false);
  const [agentTasks, setAgentTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [allAgentDemands, setAllAgentDemands] = useState([]);

  const fetchKpis = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/kpis?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Votre session a expiré ou vous n'êtes pas autorisé. Veuillez vous reconnecter.");
      }

      const text = await response.text();
      if (!text) throw new Error(`Erreur serveur (${response.status}) : Réponse vide.`);

      const data = JSON.parse(text);
      if (!response.ok) throw new Error(data.message || 'Erreur lors du calcul des KPIs.');
      setKpis(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchChart = async () => {
    setChartLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/chart?filter=${timeFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      setChartData(data.data || []);
    } catch (err) {
      console.error("Erreur chargement graphique:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchActivities = async () => {
    setActLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/activites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data.data || []);
      }
    } catch (err) {
      console.error("Erreur chargement activités:", err);
    } finally {
      setActLoading(false);
    }
  };

  const fetchRoleCharts = async () => {
    setRoleChartsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/role-charts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRoleChartsData(data.data || {});
      }
    } catch (err) {
      console.error("Erreur chargement graphes dynamiques:", err);
    } finally {
      setRoleChartsLoading(false);
    }
  };

  const isAgent = currentUser?.permissions?.includes('GERER_ACTIVITES') || currentUser?.role?.toLowerCase().includes('agent');

  const fetchAgentTasks = async () => {
    if (!isAgent) return;
    setTasksLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes?size=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        const list = json.data?.demandes || [];

        // Filter demands assigned to the current agent
        const myDemands = list.filter(d => d.agent_id === currentUser.id);
        setAllAgentDemands(myDemands);

        // Filter active tasks (non-finalized)
        const activeTasks = myDemands.filter(d => !['valide', 'rejete', 'valide_cloture'].includes(d.statut));

        // Process remaining days
        const processed = activeTasks.map(d => {
          const maxDays = d.delai_max_jours || 5;
          const maxDate = new Date(d.date_soumission);
          maxDate.setDate(maxDate.getDate() + maxDays);
          const now = new Date();
          const diffTime = maxDate - now;
          const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...d, remainingDays, maxDate };
        });

        // Sort by remainingDays ascending (urgent first)
        processed.sort((a, b) => a.remainingDays - b.remainingDays);
        setAgentTasks(processed);
      }
    } catch (err) {
      console.error("Erreur chargement tâches agent:", err);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    if (isAgent) {
      fetchAgentTasks();
    }

    // Real-time synchronization via Server-Sent Events (SSE)
    const eventSource = new EventSource(`${API_BASE_URL}/realtime/stream`);
    let sseTimer = null;

    eventSource.addEventListener("refresh_demandes", (event) => {
      console.log("Real-time update received: refresh KPIs", event.data);
      if (sseTimer) clearTimeout(sseTimer);
      sseTimer = setTimeout(() => {
        fetchKpis(true);
        fetchChart();
        fetchActivities();
        fetchRoleCharts();
        fetchAgentTasks();
      }, 1500);
    });

    eventSource.onerror = () => {
      console.log("Real-time connection temporary loss or reconnecting...");
    };

    return () => {
      eventSource.close();
      if (sseTimer) clearTimeout(sseTimer);
    };
  }, [isAgent, currentUser?.id, token]);

  useEffect(() => {
    fetchActivities();
    fetchRoleCharts();
  }, []);

  useEffect(() => {
    fetchChart();
  }, [timeFilter]);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getCardIconClass = (label) => {
    const lbl = (label || '').toLowerCase();
    if (lbl.includes('signature') || lbl.includes('signer')) return 'icon-red';
    if (lbl.includes('traité')) return 'icon-green';
    if (lbl.includes('reste')) return 'icon-orange';
    if (lbl.includes('délai moyen')) return 'icon-purple';
    if (lbl.includes('délai') || lbl.includes('expir')) return 'icon-red';
    if (lbl.includes('dossier') || lbl.includes('demande') || lbl.includes('total')) return 'icon-blue';
    if (lbl.includes('région')) return 'icon-blue';
    if (lbl.includes('département')) return 'icon-green';
    if (lbl.includes('commune')) return 'icon-orange';
    if (lbl.includes('centre')) return 'icon-purple';
    if (lbl.includes('service')) return 'icon-red';
    if (lbl.includes('utilisateur') || lbl.includes('agent')) return 'icon-orange';
    if (lbl.includes('rejet')) return 'icon-red';
    if (lbl.includes('valid')) return 'icon-green';
    if (lbl.includes('attente')) return 'icon-orange';
    if (lbl.includes('population')) return 'icon-purple';
    if (lbl.includes('satisfaction')) return 'icon-green';
    return 'icon-blue';
  };

  const getCardIcon = (label) => {
    const lbl = (label || '').toLowerCase();
    if (lbl.includes('traité')) return <CheckCircle size={24} />;
    if (lbl.includes('reste')) return <Clock size={24} />;
    if (lbl.includes('délai moyen')) return <Clock size={24} />;
    if (lbl.includes('délai') || lbl.includes('expir')) return <AlertTriangle size={24} />;
    if (lbl.includes('région')) return <Globe size={24} />;
    if (lbl.includes('département')) return <Map size={24} />;
    if (lbl.includes('commune')) return <Landmark size={24} />;
    if (lbl.includes('centre')) return <Briefcase size={24} />;
    if (lbl.includes('service')) return <Activity size={24} />;
    if (lbl.includes('utilisateur') || lbl.includes('agent')) return <Users size={24} />;
    if (lbl.includes('signature') || lbl.includes('signer')) return <FileText size={24} />;
    if (lbl.includes('dossier') || lbl.includes('demande') || lbl.includes('total')) return <FileText size={24} />;
    if (lbl.includes('population')) return <Users size={24} />;
    if (lbl.includes('rejet')) return <XCircle size={24} />;
    if (lbl.includes('satisfaction')) return <CheckCircle size={24} />;
    return <Landmark size={24} />;
  };

  const getWelcomeMessage = () => {
    const roleName = currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Utilisateur';
    const permissions = currentUser?.permissions || [];
    
    if (permissions.includes('GERER_GLOBAL')) {
      return `vous êtes connecté en tant que ${roleName} (ANEC).`;
    }
    
    if (permissions.includes('GERER_COMMUNE') && !permissions.includes('GERER_GLOBAL')) {
      const commune = currentUser?.commune_nom || 'Ouakam';
      return `vous êtes connecté en tant que ${roleName} de la commune de ${commune}.`;
    }
    
    if (permissions.includes('GERER_CENTRE') && !permissions.includes('GERER_COMMUNE')) {
      const centre = currentUser?.centre_nom || 'Ouakam';
      return `vous êtes connecté en tant que ${roleName} du centre de ${centre}.`;
    }

    if (permissions.includes('GERER_BUREAU') && !permissions.includes('GERER_CENTRE')) {
      const bureau = currentUser?.bureau_nom || '';
      return `vous êtes connecté en tant que ${roleName} du bureau de ${bureau}.`;
    }

    const centre = currentUser?.centre_nom || 'Ouakam';
    return `vous êtes connecté en tant que ${roleName} du centre de ${centre}.`;
  };

  const renderRoleCharts = () => {
    if (roleChartsLoading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ display: 'inline-block' }}></div>
          <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Chargement des statistiques...</p>
        </div>
      );
    }

    const permissions = currentUser?.permissions || [];

    // 1. Super Admin
    if (permissions.includes('GERER_GLOBAL')) {
      const communeData = roleChartsData.communeData || [];
      const regionData = roleChartsData.regionData || [];

      return (
        <div className="main-content-grid mb-6">
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              🏆 Communes les plus Performantes
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Classement par volume de demandes traitées</p>
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(v) => [v + ' demandes', 'Volume']} />
                  <Bar dataKey="demandes" radius={[0, 6, 6, 0]} barSize={18}>
                    {communeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              🗺️ Répartition Nationale par Région
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Demandes d'actes civils par région administrative</p>
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="demandes" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // 3. Officier
    if (permissions.includes('GERER_CENTRE') || permissions.includes('GERER_BUREAU')) {
      const agentPerformance = roleChartsData.agentPerformance || [];
      const validationHistory = roleChartsData.validationHistory || [];

      return (
        <div className="main-content-grid mb-6">
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              🏅 Agents les plus Performants
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Classement par nombre de dossiers traités</p>
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={95} />
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(v) => [v + ' dossiers', 'Traités']} />
                  <Bar dataKey="dossiers" radius={[0, 6, 6, 0]} barSize={18}>
                    {agentPerformance.map((entry, i) => (
                      <Cell key={i} fill={entry.fill || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              📈 Évolution du Taux de Validation (%)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Performance mensuelle de validation des actes</p>
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={validationHistory}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="rate" name="Taux de Validation" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // 4. Agent / Employé
    const agentDossiers = roleChartsData.agentDossiers || [];
    const agentProductivity = roleChartsData.agentProductivity || [];

    return (
      <div className="main-content-grid mb-6">
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
            Statut de Mes Dossiers Affectés
          </h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agentDossiers}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {agentDossiers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
            Productivité Quotidienne (Dossiers Traités)
          </h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={agentProductivity}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="dossiers" name="Dossiers Traités" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !kpis) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, padding: '5rem' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--danger)' }}>
        <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
        <h3>Erreur de chargement des statistiques</h3>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={fetchKpis} className="btn btn-secondary mt-4">Réessayer</button>
      </div>
    );
  }

  const total = parseInt(kpis?.demandes?.total || 0);
  const pending = parseInt(kpis?.demandes?.pending || 0);
  const validated = parseInt(kpis?.demandes?.validated || 0);

  const validatedPct = total > 0 ? Math.round((validated / total) * 100) : 0;
  const validationRate = total > 0 ? validatedPct + '%' : '0%';

  let perimetre = 'NATIONAL';
  if (currentUser?.role?.includes('GERANT_REGION')) perimetre = 'RÉGIONAL';
  if (currentUser?.role?.includes('GERANT_DEPARTEMENT')) perimetre = 'DÉPARTEMENTAL';
  if (currentUser?.role?.includes('GERANT_COMMUNE')) perimetre = 'COMMUNAL';

  const permissions = currentUser?.permissions || [];

  const isChefOrOfficier = permissions.includes('GERER_CENTRE') || permissions.includes('GERER_BUREAU') || permissions.includes('GERER_SERVICES');


  // PREMIMUM COMMUNE DASHBOARD
  if (permissions.includes('GERER_COMMUNE') && !permissions.includes('GERER_GLOBAL')) {
    const renderSparkline = (points, color) => (
      <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
        <path d={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

    const generateSparklinePath = (values, width = 60, height = 24) => {
      if (!values || values.length < 2) return 'M 2 12 L 58 12';
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min === 0 ? 1 : max - min;
      return values.map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
    };

    const communeName = currentUser?.commune_nom || currentUser?.commune?.nom || 'Votre Commune';
    const totalCount = total || 0;
    const pendingCount = pending || 0;
    const validatedCount = validated || 0;
    const rejectedCount = parseInt(kpis?.demandes?.rejected || 0);

    // Dynamic population mock based on commune name
    let mockPopulation = "245 840 hab.";
    if (communeName.toLowerCase().includes("dakar")) mockPopulation = "1 150 000 hab.";
    else if (communeName.toLowerCase().includes("pikine")) mockPopulation = "1 170 000 hab.";
    else if (communeName.toLowerCase().includes("rufisque")) mockPopulation = "490 000 hab.";
    else if (communeName.toLowerCase().includes("saint-louis")) mockPopulation = "277 200 hab.";

    // Active agents count
    const agtCount = roleChartsData.agentPerformance?.length || 14;

    const kpiCards = [
      {
        label: 'Demandes totales', value: totalCount, trend: '+5%', trendLabel: 'vs mois dernier',
        points: kpis?.sparklineDemandes ? generateSparklinePath(kpis.sparklineDemandes) : 'M 2 18 L 15 12 L 28 16 L 42 6 L 58 2',
        color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.04)', border: 'rgba(59, 130, 246, 0.15)', bgIcon: 'rgba(59, 130, 246, 0.1)',
        icon: <FileText size={20} />, isPositive: true
      },
      {
        label: 'En cours', value: pendingCount, trend: '-2%', trendLabel: 'vs mois dernier',
        points: kpis?.sparklinePending ? generateSparklinePath(kpis.sparklinePending) : 'M 2 4 L 15 14 L 28 10 L 42 18 L 58 22',
        color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.04)', border: 'rgba(245, 158, 11, 0.15)', bgIcon: 'rgba(245, 158, 11, 0.1)',
        icon: <Clock size={20} />, isPositive: true
      },
      {
        label: 'Dossiers validés', value: validatedCount, trend: '+12%', trendLabel: 'vs mois dernier',
        points: kpis?.sparklineValidated ? generateSparklinePath(kpis.sparklineValidated) : 'M 2 20 L 15 16 L 28 8 L 42 10 L 58 4',
        color: '#10b981', bg: 'rgba(16, 185, 129, 0.04)', border: 'rgba(16, 185, 129, 0.15)', bgIcon: 'rgba(16, 185, 129, 0.1)',
        icon: <CheckCircle size={20} />, isPositive: true
      },
      {
        label: 'Taux de validation', value: validationRate, trend: '+1.5%', trendLabel: 'vs mois dernier',
        points: 'M 2 16 L 15 18 L 28 10 L 42 4 L 58 2',
        color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.04)', border: 'rgba(139, 92, 246, 0.15)', bgIcon: 'rgba(139, 92, 246, 0.1)',
        icon: <TrendingUp size={20} />, isPositive: true
      },
      {
        label: 'Dossiers rejetés', value: rejectedCount, trend: '+0.5%', trendLabel: 'stable',
        points: 'M 2 22 L 15 18 L 28 20 L 42 14 L 58 10',
        color: '#ef4444', bg: 'rgba(239, 68, 68, 0.04)', border: 'rgba(239, 68, 68, 0.15)', bgIcon: 'rgba(239, 68, 68, 0.1)',
        icon: <AlertTriangle size={20} />, isPositive: false
      },
      {
        label: 'Délai moyen', value: '1.8 jours', trend: '-0.2 j', trendLabel: 'vs mois dernier',
        points: 'M 2 6 L 15 8 L 28 14 L 42 16 L 58 20',
        color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.04)', border: 'rgba(139, 92, 246, 0.15)', bgIcon: 'rgba(139, 92, 246, 0.1)',
        icon: <Clock size={20} />, isPositive: true
      },
      {
        label: 'Satisfaction Citoyens', value: '94.2%', trend: '+4%', trendLabel: 'vs mois dernier',
        points: 'M 2 16 L 15 18 L 28 10 L 42 4 L 58 2',
        color: '#10b981', bg: 'rgba(16, 185, 129, 0.04)', border: 'rgba(16, 185, 129, 0.15)', bgIcon: 'rgba(16, 185, 129, 0.1)',
        icon: <CheckCircle size={20} />, isPositive: true
      },
      {
        label: 'Population de la Commune', value: mockPopulation, trend: '+1.8%', trendLabel: 'vs mois dernier',
        points: 'M 2 12 L 15 10 L 28 16 L 42 8 L 58 4',
        color: '#ec4899', bg: 'rgba(236, 72, 153, 0.04)', border: 'rgba(236, 72, 153, 0.15)', bgIcon: 'rgba(236, 72, 153, 0.1)',
        icon: <Users size={20} />, isPositive: true
      },
      {
        label: 'Agents de la Commune', value: `${agtCount} agents`, trend: '+2', trendLabel: 'recrutés récemment',
        points: 'M 2 20 L 15 20 L 28 16 L 42 12 L 58 10',
        color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.04)', border: 'rgba(6, 182, 212, 0.15)', bgIcon: 'rgba(6, 182, 212, 0.1)',
        icon: <Briefcase size={20} />, isPositive: true
      }
    ];

    // Chart 1: Performance par Service (Composite Data)
    const servicePerformanceData = roleChartsData.servicePerformanceData || [];

    // Chart 2: Top 4 Officiers
    const topOfficersData = roleChartsData.topOfficersData || [];

    // Chart 3: Top Agents (Highlighting Top Agent Awa Diop)
    const topAgentsData = roleChartsData.topAgentsData || [];

    // Chart 4: Top 5 des Démarches (Donut Chart)
    const topDemarchesData = roleChartsData.topDemarchesData || [];
    const totalDemarches = topDemarchesData.reduce((acc, curr) => acc + curr.value, 0);

    return (
      <div className="page-content stats-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
        {/* Strategic Banner */}
        <div className="strategic-banner">
          <div className="banner-content">
            <div className="banner-badges">
              <span className="badge badge-green"><CheckCircle size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SYSTÈME EN LIGNE</span>
              <span className="badge badge-green" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>PÉRIMÈTRE : {perimetre}</span>
            </div>
            <h2>
              <span className="banner-title-brand">SenInnov</span>
              <span className="banner-title-separator">·</span>
              <span className="banner-title-desc">Gestion centralisée et suivi de l'administration territoriale & des services citoyens</span>
            </h2>
            <p style={{ marginTop: '8.5px', color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', fontWeight: '500' }}>
              Bonjour <strong>{currentUser?.nom_complet}</strong>, {getWelcomeMessage()}
            </p>
          </div>
          <div className="banner-stats">
            <div className="b-stat">
              <h3>{validationRate}</h3>
              <span>TAUX DE<br />VALIDATION</span>
            </div>
            <div className="b-stat">
              <h3>{total}</h3>
              <span>DOSSIERS<br />TOTAL</span>
            </div>
          </div>
        </div>

        <div className="premium-kpi-grid">
          {kpiCards.map((card, idx) => {
            const colorClass = getCardIconClass(card.label);
            const colorName = colorClass.replace('icon-', '');

            return (
              <div key={idx} className={`premium-kpi-card border-${colorName}`}>
                <div className="premium-kpi-left">
                  <div className={`premium-kpi-icon-wrapper ${colorName}`}>
                    {card.icon}
                  </div>
                  <div className="premium-kpi-content">
                    <span className="premium-kpi-label">{card.label}</span>
                    <span className="premium-kpi-value">{card.value}</span>
                  </div>
                </div>

                <div className="premium-kpi-right-effects">
                  <div className={`premium-kpi-trend ${card.isPositive ? 'up' : 'down'}`}>
                    {card.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{card.trend}</span>
                  </div>
                  {card.points && (
                    <div className="premium-kpi-sparkline">
                      {renderSparkline(card.points, card.color || '#10b981')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* First Row: Performance par Service (Full Width) */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>Performance par Services</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Comparaison du volume de dossiers et du taux de validation par département attribué
          </p>
          <div style={{ width: '100%', height: '320px' }}>
            {servicePerformanceData && servicePerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={servicePerformanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDossiers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Dossiers', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 } }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Taux (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 } }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'rgba(255, 255, 255, 0.95)' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar yAxisId="left" name="Nombre de Dossiers" dataKey="dossiers" fill="url(#colorDossiers)" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" name="Taux de Validation (%)" dataKey="rate" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucune donnée disponible</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Les statistiques apparaîtront une fois les dossiers traités.</p>
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Performance des Officiers (Top 4) - Full Width (Grand et Joli) */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Performance des Officiers (Top 4)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Nombre total de dossiers validés et signés par officier municipal
          </p>
          <div style={{ width: '100%', height: '300px' }}>
            {topOfficersData && topOfficersData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOfficersData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'rgba(255, 255, 255, 0.95)' }} formatter={(v) => [v + ' dossiers', 'Signés']} />
                  <Bar dataKey="dossiers" radius={[6, 6, 0, 0]} barSize={32}>
                    {topOfficersData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucun officier performant à afficher</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Données insuffisantes pour le moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Third Row: Top 5 Démarches & Top Agents (Side by Side) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', alignItems: 'stretch' }}>

          {/* Top 5 des Démarches Donut Chart (Styled like second photo) */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Top 5 des Démarches
            </h3>
            {topDemarchesData && topDemarchesData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flex: 1 }}>
                <div style={{ width: '160px', height: '160px', position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topDemarchesData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                        {topDemarchesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{totalDemarches}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minWidth: 0 }}>
                  {topDemarchesData.map((entry, idx) => {
                    const percentage = totalDemarches > 0 ? Math.round((entry.value / totalDemarches) * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.fill, display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0 }}>
                          {percentage}% ({entry.value})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)', minHeight: '180px' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucune démarche effectuée</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Les démarches traitées s'afficheront ici.</p>
              </div>
            )}
          </div>

          {/* Top Agents (Highlighting Awa Diop) */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {topAgentsData && topAgentsData.length > 0 && topAgentsData[0]?.isTop && (
              <div style={{
                position: 'absolute', top: '20px', right: '24px', display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🏆 Top: {topAgentsData[0].name} ({topAgentsData[0].rate || 0}%)
                </span>
              </div>
            )}

            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>Performance des Agents</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Volume de traitement et taux d'approbation par agent de saisie</p>

            {topAgentsData && topAgentsData.length > 0 ? (
              <>
                <div style={{ width: '100%', height: '280px', flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topAgentsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={100} />
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(v, name, props) => [v + ' dossiers (' + props.payload.rate + '% val.)', 'Dossiers']} />
                      <Bar dataKey="dossiers" radius={[0, 6, 6, 0]} barSize={16}>
                        {topAgentsData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {topAgentsData[0]?.isTop && (
                  <div style={{
                    marginTop: '12px', padding: '10px 14px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.8rem', color: 'var(--text-secondary)'
                  }}>
                    <span style={{ fontWeight: '700', color: '#10b981' }}>Félicitations!</span> L'agent le plus performant ce mois-ci est <strong>{topAgentsData[0].name}</strong> avec <strong>{topAgentsData[0].dossiers} dossiers</strong> traités et un excellent taux d'approbation.
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)', minHeight: '180px', flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucune donnée agent</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Les statistiques des agents apparaîtront ici.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  if (isChefOrOfficier) {
    const getKpiVal = (labelSub) => {
      const card = kpis?.cards?.find(c => c.label.toLowerCase().includes(labelSub.toLowerCase()));
      return card ? parseInt(card.value) : 0;
    };
    const agtCount = getKpiVal('agent') || getKpiVal('rattaché');
    const signatureCount = getKpiVal('signature') || getKpiVal('signer') || getKpiVal('attente de signature');
    const validatedCount = getKpiVal('validé') || validated;
    const pendingCount = getKpiVal('attente') || getKpiVal('cours') || pending;
    const rejectedCount = getKpiVal('rejet') || getKpiVal('refus');
    const totalCount = total || (validatedCount + pendingCount + rejectedCount);

    const satisfactionRate = kpis?.satisfactionRate !== undefined && kpis?.satisfactionRate !== null
      ? kpis.satisfactionRate
      : 94.2;

    const renderSparkline = (points, color) => (
      <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
        <path
          d={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

    const generateSparklinePath = (values, width = 60, height = 24) => {
      if (!values || values.length < 2) return 'M 2 12 L 58 12';
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min === 0 ? 1 : max - min;

      return values.map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
    };

    const getDynamicJobTitle = () => {
      const roleName = currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Chef de Service';
      const permissions = currentUser?.permissions || [];
      const commune = currentUser?.commune_nom || currentUser?.commune?.nom || 'Ouakam';
      const centre = currentUser?.centre_nom || currentUser?.centre?.nom || '';
      const bureau = currentUser?.bureau_nom || currentUser?.bureau?.nom || '';

      let parts = [roleName];

      if (permissions.includes('GERER_GLOBAL')) {
        parts.push("de l'ANEC");
      } else if (permissions.includes('GERER_COMMUNE')) {
        parts.push(`de la commune de ${commune}`);
      } else if (permissions.includes('GERER_CENTRE')) {
        parts.push(`de la commune de ${commune}`);
        if (centre) parts.push(`(Centre : ${centre})`);
        if (bureau) parts.push(`(Bureau : ${bureau})`);
      } else {
        parts.push(`de la commune de ${commune}`);
        if (centre) parts.push(`(Centre : ${centre})`);
      }
      return parts.join(' ');
    };

    const trendDem = kpis?.trendDemandes || '+14%';
    const trendPend = kpis?.trendPending || '-5%';
    const trendVal = kpis?.trendValidated || '+20%';
    const trendRej = kpis?.trendRejected || '+0%';
    const trendSig = kpis?.trendSignatures || '+0%';
    const trendDel = kpis?.trendDelay || '-0.6 j';
    const trendSat = kpis?.trendSatisfaction || '+7%';

    const kpiCards = [
      {
        label: 'Demandes reçues',
        value: totalCount,
        trend: trendDem,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineDemandes ? generateSparklinePath(kpis.sparklineDemandes) : 'M 2 18 L 15 12 L 28 16 L 42 6 L 58 2',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.04)',
        border: 'rgba(59, 130, 246, 0.15)',
        bgIcon: 'rgba(59, 130, 246, 0.1)',
        icon: <FileText size={20} />,
        isPositive: !trendDem.startsWith('-')
      },
      {
        label: 'En cours de traitement',
        value: pendingCount,
        trend: trendPend,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklinePending ? generateSparklinePath(kpis.sparklinePending) : 'M 2 4 L 15 14 L 28 10 L 42 18 L 58 22',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.04)',
        border: 'rgba(245, 158, 11, 0.15)',
        bgIcon: 'rgba(245, 158, 11, 0.1)',
        icon: <Clock size={20} />,
        isPositive: trendPend.startsWith('-') || trendPend.includes('0%')
      },
      {
        label: 'Dossiers validés',
        value: validatedCount,
        trend: trendVal,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineValidated ? generateSparklinePath(kpis.sparklineValidated) : 'M 2 20 L 15 16 L 28 8 L 42 10 L 58 4',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.04)',
        border: 'rgba(16, 185, 129, 0.15)',
        bgIcon: 'rgba(16, 185, 129, 0.1)',
        icon: <CheckCircle size={20} />,
        isPositive: !trendVal.startsWith('-')
      },
      {
        label: 'Dossiers rejetés',
        value: rejectedCount,
        trend: trendRej,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineRejected ? generateSparklinePath(kpis.sparklineRejected) : 'M 2 22 L 15 18 L 28 20 L 42 14 L 58 10',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.04)',
        border: 'rgba(239, 68, 68, 0.15)',
        bgIcon: 'rgba(239, 68, 68, 0.1)',
        icon: <AlertTriangle size={20} />,
        isPositive: trendRej.startsWith('-') || trendRej.includes('0%')
      },
      {
        label: 'Actes à signer',
        value: signatureCount,
        trend: trendSig,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineSignatures ? generateSparklinePath(kpis.sparklineSignatures) : 'M 2 20 L 15 16 L 28 12 L 42 8 L 58 4',
        color: '#ef4444',
        bg: signatureCount > 0 ? 'rgba(239, 68, 68, 0.02)' : 'rgba(239, 68, 68, 0.04)',
        border: signatureCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
        bgIcon: 'rgba(239, 68, 68, 0.1)',
        icon: <FileText size={20} />,
        colorValue: signatureCount > 0 ? '#ef4444' : undefined,
        isPositive: trendSig.startsWith('-') || trendSig.includes('0%')
      },
      {
        label: 'Agents rattachés',
        value: agtCount,
        trend: '+0%',
        trendLabel: 'stable',
        points: generateSparklinePath(Array(7).fill(agtCount)),
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.04)',
        border: 'rgba(59, 130, 246, 0.15)',
        bgIcon: 'rgba(59, 130, 246, 0.1)',
        icon: <Users size={20} />,
        isPositive: true
      },
      {
        label: 'Délai moyen',
        value: kpis?.averageDelay !== undefined && kpis?.averageDelay !== null ? `${kpis.averageDelay} jours` : '1.8 jours',
        trend: trendDel,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineDelay ? generateSparklinePath(kpis.sparklineDelay) : 'M 2 6 L 15 8 L 28 14 L 42 16 L 58 20',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.04)',
        border: 'rgba(139, 92, 246, 0.15)',
        bgIcon: 'rgba(139, 92, 246, 0.1)',
        icon: <Clock size={20} />,
        isPositive: trendDel.startsWith('-') || trendDel.includes('0.0')
      },
      {
        label: 'Satisfaction',
        value: `${satisfactionRate}%`,
        trend: trendSat,
        trendLabel: 'vs mois dernier',
        points: kpis?.sparklineSatisfaction ? generateSparklinePath(kpis.sparklineSatisfaction) : 'M 2 16 L 15 18 L 28 10 L 42 4 L 58 2',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.04)',
        border: 'rgba(245, 158, 11, 0.15)',
        bgIcon: 'rgba(245, 158, 11, 0.1)',
        icon: <CheckCircle size={20} />,
        isPositive: !trendSat.startsWith('-')
      }
    ];

    const typeActeData = roleChartsData.typeActeData || [];
    const validationHistory = roleChartsData.validationHistory || [];
    const statusData = roleChartsData.statusData || [];
    const statusHistory = roleChartsData.statusHistory || [];
    const generalEvolutionData = roleChartsData.generalEvolutionData || [];
    const agentPerformance = roleChartsData.agentPerformance || [];

    const totalDocTypeTotal = typeActeData.reduce((acc, curr) => acc + curr.value, 0);
    const totalStatusTotal = statusData.reduce((acc, curr) => acc + curr.value, 0);

    return (
      <div className="page-content stats-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
        {/* Strategic Banner */}
        <div className="strategic-banner">
          <div className="banner-content">
            <div className="banner-badges">
              <span className="badge badge-green"><CheckCircle size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SYSTÈME EN LIGNE</span>
              <span className="badge badge-green" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>PÉRIMÈTRE : {perimetre}</span>
            </div>
            <h2>
              <span className="banner-title-brand">SenInnov</span>
              <span className="banner-title-separator">·</span>
              <span className="banner-title-desc">Gestion centralisée et suivi de l'administration territoriale & des services citoyens</span>
            </h2>
            <p style={{ marginTop: '8.5px', color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', fontWeight: '500' }}>
              Bonjour <strong>{currentUser?.nom_complet}</strong>, {getWelcomeMessage()}
            </p>
          </div>
          <div className="banner-stats">
            <div className="b-stat">
              <h3>{validationRate}</h3>
              <span>TAUX DE<br />VALIDATION</span>
            </div>
            <div className="b-stat">
              <h3>{total}</h3>
              <span>DOSSIERS<br />TOTAL</span>
            </div>
          </div>
        </div>

        {/* 8 KPIs Row */}
        <div className="premium-kpi-grid">
          {kpiCards.map((card, idx) => {
            const colorClass = getCardIconClass(card.label);
            const colorName = colorClass.replace('icon-', '');

            return (
              <div key={idx} className={`premium-kpi-card border-${colorName}`}>
                <div className="premium-kpi-left">
                  <div className={`premium-kpi-icon-wrapper ${colorName}`}>
                    {card.icon}
                  </div>
                  <div className="premium-kpi-content">
                    <span className="premium-kpi-label">{card.label}</span>
                    <span className="premium-kpi-value">{card.value}</span>
                  </div>
                </div>

                <div className="premium-kpi-right-effects">
                  <div className={`premium-kpi-trend ${card.isPositive ? 'up' : 'neutral'}`}>
                    {card.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{card.trend}</span>
                  </div>
                  {card.points && (
                    <div className="premium-kpi-sparkline">
                      {renderSparkline(card.points, card.color || '#10b981')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Row 1 (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '24px'
        }}>
          {/* Donut Chart: Répartition par type de document */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Répartition par type d'acte
            </h3>
            {typeActeData && typeActeData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flex: 1 }}>
                <div style={{ width: '150px', height: '150px', position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeActeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {typeActeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{totalDocTypeTotal}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: 0 }}>
                  {typeActeData.map((entry, idx) => {
                    const percentage = totalDocTypeTotal > 0 ? Math.round((entry.value / totalDocTypeTotal) * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.fill, display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0 }}>
                          {percentage}% ({entry.value})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)', minHeight: '150px' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucune donnée disponible</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Répartition indisponible.</p>
              </div>
            )}
          </div>

          {/* Spline Area Chart: Évolution Générale des Dossiers */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Évolution Générale des Dossiers
              </h3>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.85rem',
                color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', background: '#ffffff'
              }}>
                Ce Mois-ci
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ width: '100%', height: '260px', flex: 1 }}>
              {generalEvolutionData && generalEvolutionData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generalEvolutionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSoumis" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorValides" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRejetes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis ticks={[0, 15, 30, 45, 60]} domain={[0, 60]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                      <Area type="monotone" name="Total Soumis" dataKey="soumis" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSoumis)" />
                      <Area type="monotone" name="Dossiers Validés" dataKey="valides" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValides)" />
                      <Area type="monotone" name="Dossiers Rejetés" dataKey="rejetes" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRejetes)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* Centered Legend at the bottom */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '0.85rem', fontWeight: '600' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                      Dossiers Rejetés
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      Dossiers Validés
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                      Total Soumis
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>Aucune donnée disponible</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Pas d'évolution à afficher pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid Row 2 (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {/* Performance des Agents (Bar Chart) */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Performance des agents
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Nombre de dossiers traités et validés par agent</p>
            <div style={{ width: '100%', height: '280px', flex: 1 }}>
              {agentPerformance && agentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(v) => [v + ' dossiers', 'Traités']} />
                    <Bar dataKey="dossiers" radius={[0, 6, 6, 0]} barSize={16}>
                      {agentPerformance.map((entry, i) => (
                        <Cell key={i} fill={entry.fill || '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>Aucune donnée disponible</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Pas de performance d'agent à afficher.</p>
                </div>
              )}
            </div>
          </div>

          {/* Dernières Activités Table (Side by Side) */}
          <div className="activity-section glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Dernières Activités</h2>
            <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
              {actLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}><div className="loading-spinner" style={{ display: 'inline-block' }}></div></div>
              ) : activities.length > 0 ? (
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Heure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.slice(0, 5).map((act) => (
                      <tr key={act.id}>
                        <td><span className={`act-type-pill pill-${act.color}`}>{act.type}</span></td>
                        <td>{act.description}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(act.heure)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Aucune activité récente.</p>
              )}
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
              Voir tout l'historique d'activité
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAgent && !isChefOrOfficier) {
    const totalMyDossiers = allAgentDemands.length || 12;
    const verifCount = allAgentDemands.filter(d => d.statut !== 'en_attente').length || 8;
    const traitementCount = allAgentDemands.filter(d => ['en_traitement', 'signature', 'pret', 'valide'].includes(d.statut)).length || 6;
    const validationCount = allAgentDemands.filter(d => ['signature', 'pret', 'valide'].includes(d.statut)).length || 3;
    const finalisationCount = allAgentDemands.filter(d => ['pret', 'valide'].includes(d.statut)).length || 2;

    const highPriority = agentTasks.filter(d => d.remainingDays <= 2).length;
    const mediumPriority = agentTasks.filter(d => d.remainingDays > 2 && d.remainingDays <= 5).length;
    const lowPriority = agentTasks.filter(d => d.remainingDays > 5).length;

    const priorityData = (highPriority || mediumPriority || lowPriority) ? [
      { name: 'Haute', value: highPriority, fill: '#ef4444' },
      { name: 'Moyenne', value: mediumPriority, fill: '#f59e0b' },
      { name: 'Basse', value: lowPriority, fill: '#10b981' }
    ].filter(d => d.value > 0) : [
      { name: 'Haute', value: 4, fill: '#ef4444' },
      { name: 'Moyenne', value: 5, fill: '#f59e0b' },
      { name: 'Basse', value: 3, fill: '#10b981' }
    ];

    const agentProductivity = roleChartsData.agentProductivity && roleChartsData.agentProductivity.length > 0
      ? roleChartsData.agentProductivity
      : [
        { day: 'Lun', dossiers: 3 },
        { day: 'Mar', dossiers: 4 },
        { day: 'Mer', dossiers: 5 },
        { day: 'Jeu', dossiers: 4 },
        { day: 'Ven', dossiers: 6 },
        { day: 'Sam', dossiers: 2 }
      ];

    const displayTasks = agentTasks.length > 0 ? agentTasks : [
      { id: 'mock1', reference: 'EC-2025-1250', citoyen_nom: 'Mamadou Fall', activite_nom: 'Extrait de naissance', priority: 'Haute', remainingDays: 1 },
      { id: 'mock2', reference: 'EC-2025-1248', citoyen_nom: 'Ibrahima Sarr', activite_nom: 'Extrait de naissance', priority: 'Moyenne', remainingDays: 2 },
      { id: 'mock3', reference: 'EC-2025-1249', citoyen_nom: 'Awa Diop', activite_nom: 'Acte de mariage', priority: 'Basse', remainingDays: 5 }
    ];

    const getDynamicJobTitle = () => {
      const roleName = currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Agent';
      const commune = currentUser?.commune_nom || currentUser?.commune?.nom || 'Ouakam';
      const centre = currentUser?.centre_nom || currentUser?.centre?.nom || 'Ouakam Cité Avion';
      return `${roleName} de la commune de ${commune} (Centre : ${centre})`;
    };

    const renderSparkline = (points, color) => (
      <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
        <path
          d={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

    const kpiCards = [
      {
        label: "Total demandes",
        value: allAgentDemands.length,
        trend: `${allAgentDemands.filter(d => new Date(d.date_soumission).toDateString() === new Date().toDateString()).length} aujourd'hui`,
        points: "M 2 18 L 15 12 L 28 16 L 42 6 L 58 2",
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.04)",
        border: "rgba(59, 130, 246, 0.15)",
        bgIcon: "rgba(59, 130, 246, 0.1)",
        icon: <FileText size={20} />,
        isPositive: true
      },
      {
        label: "Dossiers en cours",
        value: agentTasks.filter(d => ['en_cours', 'en_traitement'].includes(d.statut)).length,
        trend: "Traitement actif",
        points: "M 2 4 L 15 14 L 28 10 L 42 18 L 58 22",
        color: "#fbbf24",
        bg: "rgba(245, 158, 11, 0.04)",
        border: "rgba(245, 158, 11, 0.15)",
        bgIcon: "rgba(245, 158, 11, 0.1)",
        icon: <Clock size={20} />,
        isPositive: true
      },
      {
        label: "Reste à traiter",
        value: agentTasks.length,
        trend: `${agentTasks.filter(d => d.remainingDays <= 2 && d.remainingDays >= 0).length} urgentes`,
        points: "M 2 6 L 15 8 L 28 14 L 42 16 L 58 20",
        color: "#a855f7",
        bg: "rgba(168, 85, 247, 0.04)",
        border: "rgba(168, 85, 247, 0.15)",
        bgIcon: "rgba(168, 85, 247, 0.1)",
        icon: <Briefcase size={20} />,
        isPositive: agentTasks.filter(d => d.remainingDays <= 2 && d.remainingDays >= 0).length === 0
      },
      {
        label: "Dossiers traités",
        value: allAgentDemands.filter(d => ['valide', 'valide_cloture'].includes(d.statut)).length,
        trend: `${allAgentDemands.length > 0 ? Math.round((allAgentDemands.filter(d => ['valide', 'valide_cloture'].includes(d.statut)).length / allAgentDemands.length) * 100) : 0}% de réussite`,
        points: "M 2 20 L 15 16 L 28 8 L 42 10 L 58 4",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.04)",
        border: "rgba(16, 185, 129, 0.15)",
        bgIcon: "rgba(16, 185, 129, 0.1)",
        icon: <CheckCircle size={20} />,
        isPositive: true
      },
      {
        label: "Dossiers rejetés",
        value: allAgentDemands.filter(d => d.statut === 'rejete').length,
        trend: `${allAgentDemands.length > 0 ? ((allAgentDemands.filter(d => d.statut === 'rejete').length / allAgentDemands.length) * 100).toFixed(1) : 0}% de rejet`,
        points: "M 2 20 L 15 14 L 28 18 L 42 10 L 58 24",
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.04)",
        border: "rgba(239, 68, 68, 0.15)",
        bgIcon: "rgba(239, 68, 68, 0.1)",
        icon: <XCircle size={20} />,
        isPositive: allAgentDemands.filter(d => d.statut === 'rejete').length === 0
      },
      {
        label: "Dossiers expirés",
        value: agentTasks.filter(d => d.remainingDays < 0).length,
        trend: `${agentTasks.filter(d => d.remainingDays < 0).length} en retard`,
        points: "M 2 16 L 15 18 L 28 10 L 42 4 L 58 2",
        color: "#dc2626",
        bg: "rgba(220, 38, 38, 0.04)",
        border: "rgba(220, 38, 38, 0.15)",
        bgIcon: "rgba(220, 38, 38, 0.1)",
        icon: <AlertTriangle size={20} />,
        isPositive: agentTasks.filter(d => d.remainingDays < 0).length === 0
      },
      {
        label: "Délai moyen",
        value: kpis?.averageDelay !== undefined ? `${kpis.averageDelay} jours` : "1.2 jours",
        trend: "Temps de traitement",
        points: "M 2 6 L 15 8 L 28 14 L 42 16 L 58 20",
        color: "#06b6d4",
        bg: "rgba(6, 182, 212, 0.04)",
        border: "rgba(6, 182, 212, 0.15)",
        bgIcon: "rgba(6, 182, 212, 0.1)",
        icon: <Clock size={20} />,
        isPositive: true
      },
      {
        label: "Productivité",
        value: kpis?.satisfactionRate !== undefined ? `${kpis.satisfactionRate}%` : "85%",
        trend: "Satisfaction citoyen",
        points: "M 2 16 L 15 18 L 28 10 L 42 4 L 58 2",
        color: "#ec4899",
        bg: "rgba(236, 72, 153, 0.04)",
        border: "rgba(236, 72, 153, 0.15)",
        bgIcon: "rgba(236, 72, 153, 0.1)",
        icon: <TrendingUp size={20} />,
        isPositive: true
      }
    ];

    return (
      <div className="page-content stats-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
        {/* Strategic Banner */}
        <div className="strategic-banner">
          <div className="banner-content">
            <div className="banner-badges">
              <span className="badge badge-green"><CheckCircle size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SYSTÈME EN LIGNE</span>
              <span className="badge badge-green" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>PÉRIMÈTRE : {perimetre}</span>
            </div>
            <h2>
              <span className="banner-title-brand">SenInnov</span>
              <span className="banner-title-separator">·</span>
              <span className="banner-title-desc">Gestion centralisée et suivi de l'administration territoriale & des services citoyens</span>
            </h2>
            <p style={{ marginTop: '8.5px', color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', fontWeight: '500' }}>
              Bonjour <strong>{currentUser?.nom_complet}</strong>, {getWelcomeMessage()}
            </p>
          </div>
          <div className="banner-stats" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowAgentStats(!showAgentStats)}
              className="btn"
              style={{
                height: '42px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: showAgentStats ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: 'pointer',
                padding: '0 12px'
              }}
            >
              <Activity size={16} /> Mes stats
            </button>
            <div className="b-stat">
              <h3>{validationRate}</h3>
              <span>TAUX DE<br />VALIDATION</span>
            </div>
            <div className="b-stat">
              <h3>{total}</h3>
              <span>DOSSIERS<br />TOTAL</span>
            </div>
          </div>
        </div>

        {/* Stats card (Toggled by button) */}
        {showAgentStats && (
          <div className="glass-card" style={{
            padding: '1.5rem',
            borderRadius: '20px',
            animation: 'fadeIn 0.3s ease-out',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="kpi-icon icon-green" style={{ width: '40px', height: '40px', borderRadius: '10px' }}><CheckCircle2 size={20} /></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Taux de validation</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {validationRate}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="kpi-icon icon-blue" style={{ width: '40px', height: '40px', borderRadius: '10px' }}><Activity size={20} /></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Satisfaction Client</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {kpis?.satisfactionRate !== undefined ? `${kpis.satisfactionRate}%` : '85%'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="kpi-icon icon-orange" style={{ width: '40px', height: '40px', borderRadius: '10px' }}><Clock size={20} /></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Dossiers en cours</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {agentTasks.filter(d => ['en_cours', 'en_traitement'].includes(d.statut)).length || 7} dossiers
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPIs Grid */}
        <div className="premium-kpi-grid">
          {kpiCards.map((card, idx) => {
            const colorClass = getCardIconClass(card.label);
            const colorName = colorClass.replace('icon-', '');

            return (
              <div key={idx} className={`premium-kpi-card border-${colorName}`}>
                <div className="premium-kpi-left">
                  <div className={`premium-kpi-icon-wrapper ${colorName}`}>
                    {card.icon}
                  </div>
                  <div className="premium-kpi-content">
                    <span className="premium-kpi-label">{card.label}</span>
                    <span className="premium-kpi-value">{card.value}</span>
                  </div>
                </div>

                <div className="premium-kpi-right-effects">
                  <div className={`premium-kpi-trend ${card.isPositive ? 'up' : 'neutral'}`}>
                    {card.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{card.trend}</span>
                  </div>
                  {card.points && (
                    <div className="premium-kpi-sparkline">
                      {renderSparkline(card.points, card.color || '#10b981')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '24px'
        }}>
          {/* Column 1: Donut Priority Chart */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Mes tâches par priorité
            </h3>
            <div style={{ width: '100%', height: '200px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {priorityData.reduce((acc, c) => acc + c.value, 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total</div>
              </div>
            </div>
            {/* Custom Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '1rem', width: '100%', overflow: 'hidden' }}>
              {priorityData.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', minWidth: 0 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.fill, display: 'inline-block', flexShrink: 0 }}></span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)', marginLeft: 'auto' }}>{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Progress Avancement */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Avancement de mes dossiers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  <span>Vérification des documents</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{verifCount}/{totalMyDossiers}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(verifCount / totalMyDossiers) * 100}%`, height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  <span>Saisie / Traitement</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{traitementCount}/{totalMyDossiers}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(traitementCount / totalMyDossiers) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  <span>Validation</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{validationCount}/{totalMyDossiers}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(validationCount / totalMyDossiers) * 100}%`, height: '100%', background: '#fbbf24', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  <span>Finalisation</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{finalisationCount}/{totalMyDossiers}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(finalisationCount / totalMyDossiers) * 100}%`, height: '100%', background: '#8b5cf6', borderRadius: '4px' }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* Column 3: Productivity Weekly Chart */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Performance hebdomadaire
            </h3>
            <div style={{ width: '100%', height: '220px', flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={agentProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAgtProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Area type="monotone" name="Dossiers Traités" dataKey="dossiers" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAgtProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Queue Table & Shortcuts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Prioritized Task List Queue */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Mes tâches du jour
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Dossiers triés par priorité d'échéance (les plus urgents en premier)
            </p>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              {tasksLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}><div className="loading-spinner" style={{ display: 'inline-block' }}></div></div>
              ) : (
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>N° Dossier</th>
                      <th>Demandeur</th>
                      <th>Type d'acte</th>
                      <th>Priorité</th>
                      <th>Échéance</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTasks.slice(0, 5).map((task) => {
                      const remainingDays = task.remainingDays !== undefined ? task.remainingDays : 5;
                      let priority = 'Basse';
                      let priorityColor = '#10b981';
                      let priorityBg = 'rgba(16, 185, 129, 0.1)';

                      if (remainingDays <= 2) {
                        priority = 'Haute';
                        priorityColor = '#ef4444';
                        priorityBg = 'rgba(239, 68, 68, 0.1)';
                      } else if (remainingDays <= 5) {
                        priority = 'Moyenne';
                        priorityColor = '#f59e0b';
                        priorityBg = 'rgba(245, 158, 11, 0.1)';
                      }

                      let echeanceText = `${remainingDays} jours restant`;
                      if (remainingDays < 0) echeanceText = 'Expiré';
                      else if (remainingDays === 0) echeanceText = "Aujourd'hui";
                      else if (remainingDays === 1) echeanceText = "Aujourd'hui";
                      else if (remainingDays === 2) echeanceText = "Aujourd'hui";
                      else if (remainingDays === 3) echeanceText = "Demain";
                      else if (remainingDays === 4) echeanceText = "Demain";
                      else if (remainingDays === 5) echeanceText = "Demain";

                      return (
                        <tr key={task.id}>
                          <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{task.reference}</td>
                          <td style={{ fontWeight: 550 }}>{task.citoyen_nom || 'Demandeur anonyme'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{task.activite_nom}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: priorityColor,
                              backgroundColor: priorityBg
                            }}>
                              {priority}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{echeanceText}</td>
                          <td style={{ textAlign: 'right' }}>
                            <a href="/dashboard/demandes" className="btn btn-secondary btn-icon" style={{ padding: '0.35rem', display: 'inline-flex' }} title="Consulter la demande">
                              <Eye size={16} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
              Raccourcis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => alert('Scanner non connecté.')}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '1.25rem 1rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  height: '100px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '10px' }}>
                  <Scan size={20} />
                </div>
                <span>Scanner document</span>
              </button>

              <a
                href="/dashboard/demandes"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '1.25rem 1rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  height: '100px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '10px' }}>
                  <Search size={20} />
                </div>
                <span>Rechercher dossier</span>
              </a>

              <a
                href="/dashboard/rendez-vous"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '1.25rem 1rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  height: '100px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '10px' }}>
                  <Calendar size={20} />
                </div>
                <span>Prendre RDV</span>
              </a>

              <a
                href="/dashboard/demandes"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '1.25rem 1rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  height: '100px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '10px' }}>
                  <FileText size={20} />
                </div>
                <span>Nouveau dossier</span>
              </a>

            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSparklineGlobal = (points, color) => (
    <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
      <path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const mappedCards = kpis?.cards?.map(card => {
    const lbl = (card.label || '').toLowerCase();
    let trend = '+0%';
    let isPositive = true;
    let points = 'M 2 12 L 58 12';
    let color = '#3b82f6';
    let colorName = 'blue';

    if (lbl.includes('région')) {
      trend = '+0%';
      points = 'M 2 12 L 58 12';
      color = '#3b82f6';
      colorName = 'blue';
    } else if (lbl.includes('département')) {
      trend = '+0%';
      points = 'M 2 12 L 58 12';
      color = '#10b981';
      colorName = 'green';
    } else if (lbl.includes('commune')) {
      trend = '+1.8%';
      points = 'M 2 20 L 15 16 L 28 18 L 42 12 L 58 6';
      color = '#f59e0b';
      colorName = 'orange';
    } else if (lbl.includes('utilisateur') || lbl.includes('agent')) {
      trend = '+4.2%';
      points = 'M 2 20 L 15 14 L 28 16 L 42 8 L 58 4';
      color = '#f59e0b';
      colorName = 'orange';
    } else if (lbl.includes('demande') || lbl.includes('total')) {
      trend = '+14%';
      points = 'M 2 18 L 15 12 L 28 16 L 42 6 L 58 2';
      color = '#3b82f6';
      colorName = 'blue';
    } else if (lbl.includes('valid')) {
      trend = '+20%';
      points = 'M 2 20 L 15 16 L 28 8 L 42 10 L 58 4';
      color = '#10b981';
      colorName = 'green';
    } else if (lbl.includes('attente')) {
      trend = '-5%';
      isPositive = false;
      points = 'M 2 4 L 15 14 L 28 10 L 42 18 L 58 22';
      color = '#f59e0b';
      colorName = 'orange';
    }

    return {
      ...card,
      trend,
      isPositive,
      points,
      color,
      colorName
    };
  }) || [];

  return (
    <div className="page-content stats-layout">

      {/* Strategic Banner */}
      <div className="strategic-banner">
        <div className="banner-content">
          <div className="banner-badges">
            <span className="badge badge-green"><CheckCircle size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SYSTÈME EN LIGNE</span>
            <span className="badge badge-green" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>PÉRIMÈTRE : {perimetre}</span>
          </div>
          <h2>
              <span className="banner-title-brand">SenInnov</span>
              <span className="banner-title-separator">·</span>
              <span className="banner-title-desc">Gestion centralisée et suivi de l'administration territoriale & des services citoyens</span>
            </h2>
          <p style={{ marginTop: '8.5px', color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', fontWeight: '500' }}>
            Bonjour <strong>{currentUser?.nom_complet}</strong>, {getWelcomeMessage()}
          </p>
        </div>
        <div className="banner-stats">
          <div className="b-stat">
            <h3>{validationRate}</h3>
            <span>TAUX DE<br />VALIDATION</span>
          </div>
          <div className="b-stat">
            <h3>{total}</h3>
            <span>DOSSIERS<br />TOTAL</span>
          </div>
        </div>
      </div>


      {/* KPI Grid */}
      <section className="kpi-section">
        <div className="premium-kpi-grid">
          {mappedCards.map((card, idx) => (
            <div key={idx} className={`premium-kpi-card border-${card.colorName}`}>
              <div className="premium-kpi-left">
                <div className={`premium-kpi-icon-wrapper ${card.colorName}`}>
                  {getCardIcon(card.label)}
                </div>
                <div className="premium-kpi-content">
                  <span className="premium-kpi-label">{card.label}</span>
                  <span className="premium-kpi-value">{card.value}</span>
                </div>
              </div>

              <div className="premium-kpi-right-effects">
                <div className={`premium-kpi-trend ${card.isPositive ? 'up' : 'down'}`}>
                  {card.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{card.trend}</span>
                </div>
                {card.points && (
                  <div className="premium-kpi-sparkline">
                    {renderSparklineGlobal(card.points, card.color)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Role specific analytics graphs */}
      {renderRoleCharts()}

      {/* General Chart Section (Full Width) */}
      <div className="glass-card mb-6" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Évolution Générale des Dossiers
          </h2>
          <select
            className="form-input form-select"
            style={{ width: '200px', padding: '8px 12px', fontSize: '14px', borderRadius: '8px', height: '38px' }}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="7days">7 Derniers Jours</option>
            <option value="month">Ce Mois-ci</option>
            <option value="6months">6 Derniers Mois</option>
            <option value="12months">12 Derniers Mois</option>
            <option value="year">Cette Année</option>
            <option value="all">Tout le temps</option>
          </select>
        </div>

        {chartLoading ? (
          <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : chartData.length > 0 ? (
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSoumis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorValides" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRejetes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" name="Total Soumis" dataKey="soumis" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSoumis)" />
                <Area type="monotone" name="Dossiers Validés" dataKey="valides" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValides)" />
                <Area type="monotone" name="Dossiers Rejetés" dataKey="rejetes" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRejetes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            Aucune donnée pour cette période.
          </div>
        )}
      </div>

      {/* Activités (Full Width) */}
      <div className="activity-section glass-card">
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Dernières Activités</h2>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          {actLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><div className="loading-spinner" style={{ display: 'inline-block' }}></div></div>
          ) : activities.length > 0 ? (
            <table className="modern-data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Heure</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act) => (
                  <tr key={act.id}>
                    <td><span className={`act-type-pill pill-${act.color}`}>{act.type}</span></td>
                    <td>{act.description}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(act.heure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Aucune activité récente.</p>
          )}
        </div>
        <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
          Voir tout l'historique
        </button>
      </div>

    </div>
  );
}
