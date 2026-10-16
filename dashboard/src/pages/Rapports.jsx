import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, BarChart2, Filter, Users, Building, Activity, MapPin, TrendingUp, PieChart as PieIcon, Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { useToast } from '../components/Toast';

const renderMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code blocks
        if (line.trim().startsWith('```')) {
            if (currentBlock && currentBlock.type === 'code') {
                blocks.push(currentBlock);
                currentBlock = null;
            } else {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = { type: 'code', lines: [] };
            }
            continue;
        }

        if (currentBlock && currentBlock.type === 'code') {
            currentBlock.lines.push(line);
            continue;
        }

        // Tables
        if (line.trim().startsWith('|')) {
            if (currentBlock && currentBlock.type === 'table') {
                currentBlock.lines.push(line);
            } else {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = { type: 'table', lines: [line] };
            }
            continue;
        }

        if (currentBlock && currentBlock.type === 'table') {
            blocks.push(currentBlock);
            currentBlock = null;
        }

        // Headers
        if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
            if (currentBlock) blocks.push(currentBlock);
            blocks.push({ type: 'header', text: line });
            continue;
        }

        // Lists
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            if (currentBlock && currentBlock.type === 'list') {
                currentBlock.lines.push(line);
            } else {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = { type: 'list', lines: [line] };
            }
            continue;
        }

        // Empty lines
        if (line.trim() === '') {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
            blocks.push({ type: 'empty' });
            continue;
        }

        // Paragraphs
        if (currentBlock && currentBlock.type === 'paragraph') {
            currentBlock.text += '\n' + line;
        } else {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = { type: 'paragraph', text: line };
        }
    }
    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks.map((block, index) => {
        const key = index;

        const parseInline = (str) => {
            let html = str;
            html = html
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
            return <span dangerouslySetInnerHTML={{ __html: html }} />;
        };

        switch (block.type) {
            case 'header': {
                const text = block.text;
                if (text.startsWith('# ')) {
                    return <h1 key={key} style={{ fontSize: '1.6rem', fontWeight: 800, margin: '1.5rem 0 0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', color: 'var(--text-primary)' }}>{parseInline(text.replace('# ', ''))}</h1>;
                }
                if (text.startsWith('## ')) {
                    return <h2 key={key} style={{ fontSize: '1.3rem', fontWeight: 700, margin: '1.25rem 0 0.6rem', color: 'var(--text-primary)', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>{parseInline(text.replace('## ', ''))}</h2>;
                }
                return <h3 key={key} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>{parseInline(text.replace('### ', ''))}</h3>;
            }
            case 'code': {
                return (
                    <pre key={key} style={{
                        background: 'var(--bg-primary, rgba(30, 41, 59, 0.05))',
                        color: 'var(--text-primary)',
                        padding: '1rem',
                        borderRadius: '12px',
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        border: '1px solid var(--border-color)',
                        margin: '1rem 0',
                        whiteSpace: 'pre'
                    }}>
                        {block.lines.join('\n')}
                    </pre>
                );
            }
            case 'table': {
                const rows = block.lines.map(l => l.trim().split('|').map(cell => cell.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1));
                if (rows.length === 0) return null;

                let hasHeader = false;
                let headerRow = null;
                let dataRows = rows;

                if (rows.length > 1 && rows[1].every(cell => /^:-*-*:?$/.test(cell) || /^-+$/.test(cell))) {
                    hasHeader = true;
                    headerRow = rows[0];
                    dataRows = rows.slice(2);
                }

                return (
                    <div key={key} style={{ overflowX: 'auto', margin: '1rem 0', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                            {hasHeader && (
                                <thead style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', borderBottom: '2px solid var(--border-color)' }}>
                                    <tr>
                                        {headerRow.map((cell, idx) => (
                                            <th key={idx} style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{parseInline(cell)}</th>
                                        ))}
                                    </tr>
                                </thead>
                            )}
                            <tbody>
                                {dataRows.map((row, rowIdx) => (
                                    <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                                        {row.map((cell, idx) => (
                                            <td key={idx} style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{parseInline(cell)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            case 'list': {
                return (
                    <ul key={key} style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', listStyleType: 'disc' }}>
                        {block.lines.map((l, idx) => (
                            <li key={idx} style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                                {parseInline(l.replace(/^[\s*-]+/, '').trim())}
                            </li>
                        ))}
                    </ul>
                );
            }
            case 'paragraph': {
                return <p key={key} style={{ margin: '0.5rem 0', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{parseInline(block.text)}</p>;
            }
            case 'empty': {
                return <div key={key} style={{ height: '0.5rem' }} />;
            }
            default:
                return null;
        }
    });
};

const convertMarkdownToHtml = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    let htmlResult = '';
    let inCode = false;
    let inTable = false;
    let inList = false;
    let tableLines = [];
    let listLines = [];
    let codeLines = [];

    const parseInlineHtml = (str) => {
        let clean = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return clean;
    };

    const flushTable = () => {
        if (tableLines.length === 0) return '';
        const rows = tableLines.map(l => l.trim().split('|').map(cell => cell.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1));
        tableLines = [];

        let hasHeader = false;
        let headerRow = null;
        let dataRows = rows;
        if (rows.length > 1 && rows[1].every(cell => /^:-*-*:?$/.test(cell) || /^-+$/.test(cell))) {
            hasHeader = true;
            headerRow = rows[0];
            dataRows = rows.slice(2);
        }

        let tableHtml = '<div style="overflow-x:auto; margin:1rem 0; border:1px solid #e2e8f0; border-radius:8px;"><table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">';
        if (hasHeader) {
            tableHtml += '<thead style="background-color:#f8fafc; border-bottom:2px solid #e2e8f0;"><tr>';
            headerRow.forEach(cell => {
                tableHtml += `<th style="padding:0.75rem 1rem; font-weight:700; color:#1e293b;">${parseInlineHtml(cell)}</th>`;
            });
            tableHtml += '</tr></thead>';
        }
        tableHtml += '<tbody>';
        dataRows.forEach((row, rIdx) => {
            tableHtml += `<tr style="border-bottom:1px solid #e2e8f0; background-color:${rIdx % 2 === 0 ? 'transparent' : '#f8fafc'};">`;
            row.forEach(cell => {
                tableHtml += `<td style="padding:0.75rem 1rem; color:#475569;">${parseInlineHtml(cell)}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        return tableHtml;
    };

    const flushList = () => {
        if (listLines.length === 0) return '';
        let listHtml = '<ul style="padding-left:1.5rem; margin:0.5rem 0;">';
        listLines.forEach(l => {
            listHtml += `<li style="margin-bottom:0.35rem; color:#475569;">${parseInlineHtml(l.replace(/^[\\s*-]+/, '').trim())}</li>`;
        });
        listHtml += '</ul>';
        listLines = [];
        return listHtml;
    };

    const flushCode = () => {
        if (codeLines.length === 0) return '';
        const codeHtml = `<pre style="background-color:#f1f5f9; color:#0f172a; padding:1rem; border-radius:8px; overflow-x:auto; font-family:monospace; font-size:0.85rem; border:1px solid #e2e8f0; margin:1rem 0; line-height:1.4; white-space:pre;">${codeLines.join('\n')}</pre>`;
        codeLines = [];
        return codeHtml;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim().startsWith('```')) {
            if (inCode) {
                htmlResult += flushCode();
                inCode = false;
            } else {
                htmlResult += flushTable() + flushList();
                inCode = true;
            }
            continue;
        }

        if (inCode) {
            codeLines.push(line);
            continue;
        }

        if (line.trim().startsWith('|')) {
            htmlResult += flushList();
            inTable = true;
            tableLines.push(line);
            continue;
        }

        if (inTable && !line.trim().startsWith('|')) {
            htmlResult += flushTable();
            inTable = false;
        }

        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            htmlResult += flushTable();
            inList = true;
            listLines.push(line);
            continue;
        }

        if (inList && !line.trim().startsWith('* ') && !line.trim().startsWith('- ')) {
            htmlResult += flushList();
            inList = false;
        }

        if (line.startsWith('# ')) {
            htmlResult += `<h1 style="border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem; font-size:1.75rem; font-weight:800; color:#1e293b; margin-top:1.5rem;">${parseInlineHtml(line.replace('# ', ''))}</h1>`;
        } else if (line.startsWith('## ')) {
            htmlResult += `<h2 style="font-size:1.3rem; font-weight:700; color:#1e293b; margin-top:1.5rem; border-left:3px solid #6366f1; padding-left:8px;">${parseInlineHtml(line.replace('## ', ''))}</h2>`;
        } else if (line.startsWith('### ')) {
            htmlResult += `<h3 style="font-size:1.1rem; font-weight:700; color:#1e293b; margin-top:1.25rem;">${parseInlineHtml(line.replace('### ', ''))}</h3>`;
        } else if (line.trim() === '') {
            htmlResult += '<div style="height:0.5rem;"></div>';
        } else {
            htmlResult += `<p style="margin:0.5rem 0; color:#475569; line-height:1.6;">${parseInlineHtml(line)}</p>`;
        }
    }

    htmlResult += flushTable() + flushList() + flushCode();
    return htmlResult;
};

export default function Rapports({ token, currentUser }) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState(null);
    const [activities, setActivities] = useState([]);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [aiReport, setAiReport] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportPeriod, setReportPeriod] = useState('hebdo');

    // Filtres par défaut: 1er jour du mois courant à aujourd'hui
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(formatDate(firstDay));
    const [endDate, setEndDate] = useState(formatDate(today));
    const [selectedActivity, setSelectedActivity] = useState('');

    const handleGeneratePeriodAIReport = async () => {
        setIsGeneratingReport(true);
        try {
            const hostname = window.location.hostname;
            const end = new Date();
            const start = new Date();
            let periodLabel = "Hebdo";

            if (reportPeriod === 'quotidien') {
                periodLabel = "Quotidien";
            } else if (reportPeriod === 'hebdo') {
                start.setDate(end.getDate() - 7);
                periodLabel = "Hebdo";
            } else if (reportPeriod === 'mensuel') {
                start.setDate(end.getDate() - 30);
                periodLabel = "Mensuel";
            }

            const formattedStart = formatDate(start);
            const formattedEnd = formatDate(end);

            // Fetch the stats for this specific period
            let statsUrl = `${API_BASE_URL}/reports/advanced?startDate=${formattedStart}&endDate=${formattedEnd}`;
            if (selectedActivity) {
                statsUrl += `&activityId=${selectedActivity}`;
            }

            const statsRes = await fetch(statsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!statsRes.ok) throw new Error("Erreur de récupération des données pour la période sélectionnée");
            const statsData = await statsRes.json();

            if (statsData.status !== 'success') throw new Error(statsData.message || "Erreur de chargement");

            const reportsPayload = statsData.data;

            // Generate report with AI
            const body = {
                startDate: formattedStart,
                endDate: formattedEnd,
                stats: {
                    total: reportsPayload?.statuts?.total || 0,
                    valide: reportsPayload?.statuts?.valide || 0,
                    en_attente: reportsPayload?.statuts?.en_attente || 0,
                    signature: reportsPayload?.statuts?.signature || 0,
                    rejete: reportsPayload?.statuts?.rejete || 0
                },
                activityLabel: selectedActivity
                    ? (activities.find(a => String(a.id) === String(selectedActivity))?.nom || "Activité spécifique")
                    : "Tous les types d'actes",
                topDocuments: reportsPayload?.topDocuments || [],
                performance: reportsPayload?.performance || []
            };

            const aiRes = await fetch(`http://${hostname}:8000/api/ai/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!aiRes.ok) throw new Error("Erreur de génération par l'IA");
            const aiData = await aiRes.json();

            if (aiData.status === 'success') {
                setAiReport(aiData.report);
                setIsReportModalOpen(true);
                showToast(`Décisions (${periodLabel}) générées avec succès !`, 'success');
            } else {
                showToast("Erreur lors de la génération des décisions", 'error');
            }
        } catch (err) {
            console.error(err);
            showToast(err.message || "Erreur lors de la communication avec les serveurs", 'error');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const permissions = currentUser?.permissions || [];
    const hierarchy = ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES', 'GERER_ARCHIVE'];
    const userLevelIndex = permissions.length > 0 ? Math.min(...permissions.map(p => hierarchy.indexOf(p)).filter(i => i !== -1)) : -1;

    const fetchActivities = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/activities`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const json = await response.json();
                setActivities(json.data?.activities || []);
            }
        } catch (err) {
            console.error('Erreur chargement activités:', err);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/reports/advanced?startDate=${startDate}&endDate=${endDate}`;
            if (selectedActivity) {
                url += `&activityId=${selectedActivity}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const json = await response.json();
            if (json.status === 'success') {
                setReports(json.data);
            } else {
                showToast(json.message || "Erreur de chargement", 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur réseau', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        fetchReports();
    }, []);

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchReports();
    };

    const handleExportCSV = async () => {
        try {
            let url = `${API_BASE_URL}/reports/export/csv?startDate=${startDate}&endDate=${endDate}`;
            if (selectedActivity) {
                url += `&activityId=${selectedActivity}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `rapport_demandes_${startDate}_au_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast("Export réussi", 'success');
        } catch (err) {
            showToast("Erreur lors de l'export CSV", 'error');
        }
    };

    const handleExportPDF = () => {
        window.print();
    };

    if (userLevelIndex > hierarchy.indexOf('GERER_BUREAU') || userLevelIndex === -1) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Accès Refusé</h2>
                <p>Vous n'avez pas l'autorisation d'accéder aux rapports.</p>
            </div>
        );
    }

    return (
        <div className="reports-container">
            <div className="flex-space mb-6">
                <div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Analysez les performances et consultez les rapports détaillés de votre périmètre.
                    </p>
                </div>
                <div className="flex-gap">
                    <button className="btn btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} />
                        Exporter CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleExportPDF}>
                        <FileText size={18} />
                        Exporter PDF
                    </button>
                </div>
            </div>

            {/* SECTION DECISIONS IA */}
            <div className="glass-card mb-6" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.2)', background: 'linear-gradient(180deg, var(--bg-secondary) 0%, rgba(139, 92, 246, 0.03) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)' }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Rapport IA & Aide à la Décision</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>Générez des analyses stratégiques approfondies</p>
                    </div>
                </div>

                {/* Selector cards container */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                    {/* Card 1: Quotidien */}
                    <div
                        onClick={() => setReportPeriod('quotidien')}
                        style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'var(--bg-secondary)',
                            border: reportPeriod === 'quotidien' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                            boxShadow: reportPeriod === 'quotidien' ? '0 8px 20px rgba(37, 99, 235, 0.15)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: reportPeriod === 'quotidien' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-primary)',
                            color: reportPeriod === 'quotidien' ? '#2563eb' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Calendar size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Quotidien</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Insights d'aujourd'hui</div>
                        </div>
                    </div>

                    {/* Card 2: Hebdo */}
                    <div
                        onClick={() => setReportPeriod('hebdo')}
                        style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'var(--bg-secondary)',
                            border: reportPeriod === 'hebdo' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                            boxShadow: reportPeriod === 'hebdo' ? '0 8px 20px rgba(37, 99, 235, 0.15)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: reportPeriod === 'hebdo' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-primary)',
                            color: reportPeriod === 'hebdo' ? '#2563eb' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hebdo</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Tendances de la semaine</div>
                        </div>
                    </div>

                    {/* Card 3: Mensuel */}
                    <div
                        onClick={() => setReportPeriod('mensuel')}
                        style={{
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'var(--bg-secondary)',
                            border: reportPeriod === 'mensuel' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                            boxShadow: reportPeriod === 'mensuel' ? '0 8px 20px rgba(37, 99, 235, 0.15)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: reportPeriod === 'mensuel' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-primary)',
                            color: reportPeriod === 'mensuel' ? '#2563eb' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Activity size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Mensuel</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Analyse du mois</div>
                        </div>
                    </div>
                </div>

                {/* Full width button */}
                <button
                    onClick={handleGeneratePeriodAIReport}
                    disabled={isGeneratingReport}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: '700',
                        fontSize: '1rem',
                        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
                        transition: 'all 0.25s ease',
                        marginTop: '0.5rem'
                    }}
                    className="btn"
                >
                    {isGeneratingReport ? (
                        <div className="loading-spinner" style={{ width: '18px', height: '18px', borderLeftColor: '#ffffff', margin: 0 }}></div>
                    ) : (
                        <Sparkles size={18} />
                    )}
                    <span>Générer les Rapports ({reportPeriod === 'quotidien' ? 'Quotidien' : reportPeriod === 'hebdo' ? 'Hebdo' : 'Mensuel'})</span>
                </button>
            </div>

            <div className="glass-card mb-6" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={18} /> Filtres Avancés
                </h3>
                <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label className="form-label">Date de début</label>
                        <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="form-label">Date de fin</label>
                        <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                    </div>
                    <div style={{ flexGrow: 1, minWidth: '200px' }}>
                        <label className="form-label">Type d'acte (Activité)</label>
                        <select className="form-input form-select" value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}>
                            <option value="">Tous les types d'actes</option>
                            {activities.map(act => (
                                <option key={act.id} value={act.id}>{act.nom}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Appliquer</button>
                </form>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : reports ? (
                <>
                    <div className="kpi-grid mb-6">
                        <div className="kpi-card glass-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                            <div className="kpi-icon icon-blue">
                                <FileText size={22} />
                            </div>
                            <div className="kpi-info-vertical">
                                <span className="kpi-label">Total Demandes</span>
                                <span className="kpi-number">{reports.statuts?.total || 0}</span>
                            </div>
                        </div>
                        <div className="kpi-card glass-card" style={{ borderLeft: '4px solid var(--success)' }}>
                            <div className="kpi-icon icon-green">
                                <CheckCircle2 size={22} />
                            </div>
                            <div className="kpi-info-vertical">
                                <span className="kpi-label">Validées</span>
                                <span className="kpi-number">{reports.statuts?.valide || 0}</span>
                            </div>
                        </div>
                        <div className="kpi-card glass-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                            <div className="kpi-icon icon-orange">
                                <Clock size={22} />
                            </div>
                            <div className="kpi-info-vertical">
                                <span className="kpi-label">En Attente / En Cours</span>
                                <span className="kpi-number">{reports.statuts?.en_attente || 0}</span>
                            </div>
                        </div>
                        <div className="kpi-card glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                            <div className="kpi-icon icon-red">
                                <XCircle size={22} />
                            </div>
                            <div className="kpi-info-vertical">
                                <span className="kpi-label">Rejetées</span>
                                <span className="kpi-number">{reports.statuts?.rejete || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                        {/* Graphique 1: Évolution des demandes (Timeline) */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                                Évolution des demandes
                            </h3>
                            {reports.timeline && reports.timeline.length > 0 ? (
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={reports.timeline}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="count" name="Demandes" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Aucune donnée temporelle disponible</p>
                            )}
                        </div>

                        {/* Graphique 2: Répartition des Statuts */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PieIcon size={20} style={{ color: 'var(--warning)' }} />
                                Répartition par statut
                            </h3>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Validées', value: reports.statuts?.valide || 0 },
                                                { name: 'En Attente', value: reports.statuts?.en_attente || 0 },
                                                { name: 'Signature', value: reports.statuts?.signature || 0 },
                                                { name: 'Rejetées', value: reports.statuts?.rejete || 0 }
                                            ].filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="var(--success)" />
                                            <Cell fill="var(--warning)" />
                                            <Cell fill="var(--info)" />
                                            <Cell fill="var(--danger)" />
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Graphique 3: Top Documents Demandés */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={20} style={{ color: 'var(--primary)' }} />
                                Actes les plus demandés
                            </h3>
                            {reports.topDocuments && reports.topDocuments.length > 0 ? (
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reports.topDocuments} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis dataKey="nom" type="category" width={120} tick={{ fontSize: 11 }} />
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" name="Demandes" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                                                {reports.topDocuments.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={`hsl(145, 60%, ${40 + index * 10}%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Aucune donnée disponible</p>
                            )}
                        </div>

                        {/* Graphique 4: Classement des Entités */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {reports.entityLabel === 'Commune' && <MapPin size={20} style={{ color: 'var(--success)' }} />}
                                {reports.entityLabel === 'Centre' && <Building size={20} style={{ color: 'var(--success)' }} />}
                                {reports.entityLabel === 'Agent' && <Users size={20} style={{ color: 'var(--success)' }} />}
                                Classement des {reports.entityLabel}{reports.entityLabel !== 'Données' ? 's' : ''}
                            </h3>
                            {reports.performance && reports.performance.length > 0 ? (
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reports.performance.slice(0, 5)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" name="Dossiers traités" fill="var(--success)" radius={[4, 4, 0, 0]}>
                                                {reports.performance.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={`hsl(210, 60%, ${50 + index * 8}%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Aucune donnée disponible</p>
                            )}
                        </div>
                    </div>


                </>
            ) : null}

            {/* AI REPORT MODAL */}
            {isReportModalOpen && aiReport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: 'var(--bg-secondary, #ffffff)', padding: '2.5rem', borderRadius: '24px', maxWidth: '750px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={24} style={{ color: '#8b5cf6' }} />
                                Rapport d'Activité Généré par l'IA
                            </h2>
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.5rem', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }} className="markdown-report-content">
                            {renderMarkdown(aiReport)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(aiReport);
                                    showToast("Rapport copié dans le presse-papiers !", "success");
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Download size={16} /> Copier le texte
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    // open print window with only the report content
                                    const printWin = window.open('', '_blank');
                                    printWin.document.write(`
                                        <html>
                                            <head>
                                                <title>Rapport d'Activité IA - Teranga Civil</title>
                                                <style>
                                                    body { font-family: system-ui, sans-serif; padding: 3rem; color: #1e293b; line-height: 1.6; }
                                                    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; font-size: 1.8rem; font-weight: 800; color: #1e293b; }
                                                    h2 { font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-top: 1.5rem; border-left: 3px solid #6366f1; padding-left: 8px; }
                                                    h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-top: 1.25rem; }
                                                    li { margin-bottom: 0.35rem; color: #475569; }
                                                    p { margin: 0.5rem 0; color: #475569; line-height: 1.6; }
                                                    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; text-align: left; }
                                                    th { padding: 0.75rem 1rem; font-weight: 700; color: #1e293b; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; }
                                                    td { padding: 0.75rem 1rem; color: #475569; border-bottom: 1px solid #e2e8f0; }
                                                    pre { background-color: #f1f5f9; color: #0f172a; padding: 1rem; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.85rem; border: 1px solid #e2e8f0; margin: 1rem 0; line-height: 1.4; white-space: pre; }
                                                </style>
                                            </head>
                                            <body>
                                                \${convertMarkdownToHtml(aiReport)}
                                                <script>
                                                    window.onload = function() { window.print(); window.close(); }
                                                </script>
                                            </body>
                                        </html>
                                    `);
                                    printWin.document.close();
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <FileText size={16} /> Imprimer / PDF
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsReportModalOpen(false)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
