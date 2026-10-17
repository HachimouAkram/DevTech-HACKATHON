import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UsersList from './pages/UsersList';
import RegionsList from './pages/RegionsList';
import DepartementsList from './pages/DepartementsList';
import CommunesList from './pages/CommunesList';
import CentresList from './pages/CentresList';
import DashboardHome from './pages/DashboardHome';
import ServicesList from './pages/ServicesList';
import ActivitiesList from './pages/ActivitiesList';
import DemandesList from './pages/DemandesList';
import DocumentsToSign from './pages/DocumentsToSign';
import BureauxList from './pages/BureauxList';
import ProfilsList from './pages/ProfilsList';
import MonProfil from './pages/MonProfil';
import DocumentTemplates from './pages/DocumentTemplates';
import RendezVousList from './pages/RendezVousList';
import AuditLogsList from './pages/AuditLogsList';
import ErrorBoundary from './components/ErrorBoundary';
import Rapports from './pages/Rapports';
import TransactionsList from './pages/TransactionsList';
import PointagePresence from './pages/PointagePresence';
import { ToastProvider } from './components/Toast';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import api from './utils/api';
import { isCitizenUser } from './utils/roles';
import CitizenLayout from './components/citizen/CitizenLayout';
import CitizenHome from './pages/citizen/CitizenHome';
import CitizenDemandesList from './pages/citizen/CitizenDemandesList';
import CitizenNewDemande from './pages/citizen/CitizenNewDemande';
import CitizenDemandeDetail from './pages/citizen/CitizenDemandeDetail';
import CitizenRendezVous from './pages/citizen/CitizenRendezVous';
import CitizenActes from './pages/citizen/CitizenActes';
import CitizenAiAssistant from './pages/citizen/CitizenAiAssistant';
import CitizenProfile from './pages/citizen/CitizenProfile';


export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (jwt, newUser) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    if (jwt) {
      localStorage.setItem('token', jwt);
      setToken(jwt);
    }
    setUser(newUser);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error("Logout error", e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <ToastProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={<LandingPage user={user} onLogout={handleLogout} />}
            />

            <Route
              path="/login"
              element={user ? <Navigate to={isCitizenUser(user) ? "/citoyen" : "/dashboard"} replace /> : <Login onLogin={handleLogin} />}
            />

            <Route
              path="/dashboard/rapports"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_BUREAU']}>
                      <Rapports token={token} currentUser={user} />
                    </ProtectedRoute>
                  </Layout>
                ) : <Navigate to="/login" replace />
              }
            />

            <Route
              path="/dashboard/transactions"
              element={
                user && !user.permissions?.includes('GERER_GLOBAL') ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_BUREAU']}>
                      <TransactionsList token={token} currentUser={user} />
                    </ProtectedRoute>
                  </Layout>
                ) : <Navigate to={user ? "/dashboard" : "/login"} replace />
              }
            />

            <Route
              path="/dashboard"
              element={
                user ? (
                  isCitizenUser(user) ? (
                    <Navigate to="/citoyen" replace />
                  ) : (
                    <Layout user={user} onLogout={handleLogout}>
                      <DashboardHome token={token} currentUser={user} />
                    </Layout>
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/users"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_SERVICES']}>
                      <ErrorBoundary>
                        <UsersList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/profils"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} exactPermissions={['GERER_GLOBAL']}>
                      <ErrorBoundary>
                        <ProfilsList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/profil"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <MonProfil token={token} currentUser={user} />
                    </ErrorBoundary>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/regions"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} exactPermissions={['GERER_GLOBAL']}>
                      <ErrorBoundary>
                        <RegionsList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/departements"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} strictAllowedLevels={['GERER_DEPARTEMENT']}>
                      <ErrorBoundary>
                        <DepartementsList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/communes"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} strictAllowedLevels={['GERER_COMMUNE']}>
                      <ErrorBoundary>
                        <CommunesList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/centres"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_COMMUNE']}>
                      <ErrorBoundary>
                        <CentresList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/bureaux"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_CENTRE']}>
                      <ErrorBoundary>
                        <BureauxList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/services"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_BUREAU']}>
                      <ErrorBoundary>
                        <ServicesList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/activities"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_GLOBAL']} allowAgent={true}>
                      <ErrorBoundary>
                        <ActivitiesList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/demandes"
              element={
                user && !user.permissions?.includes('GERER_GLOBAL') ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <DemandesList token={token} currentUser={user} isArchive={false} />
                    </ErrorBoundary>
                  </Layout>
                ) : <Navigate to={user ? "/dashboard" : "/login"} replace />
              }
            />

            <Route
              path="/dashboard/documents-a-signer"
              element={
                user && user.permissions?.includes('GERER_COMMUNE') && !user.permissions?.includes('GERER_GLOBAL') ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <DocumentsToSign token={token} currentUser={user} defaultArchive={false} />
                    </ErrorBoundary>
                  </Layout>
                ) : <Navigate to={user ? "/dashboard" : "/login"} replace />
              }
            />

            <Route
              path="/dashboard/archives"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} exactPermissions={['GERER_ARCHIVE']}>
                      <ErrorBoundary>
                        <DemandesList token={token} currentUser={user} isArchive={true} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/document-templates"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_GLOBAL']}>
                      <ErrorBoundary>
                        <DocumentTemplates token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/rendez-vous"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <RendezVousList token={token} currentUser={user} />
                    </ErrorBoundary>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/audit-logs"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_CENTRE']}>
                      <ErrorBoundary>
                        <AuditLogsList token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/dashboard/pointage"
              element={
                user ? (
                  <Layout user={user} onLogout={handleLogout}>
                    <ProtectedRoute user={user} allowedLevels={['GERER_BUREAU']}>
                      <ErrorBoundary>
                        <PointagePresence token={token} currentUser={user} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            
            {/* ================= CITIZEN PORTAL ROUTES ================= */}
            <Route
              path="/citoyen"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenHome user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/demandes"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenDemandesList user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/demande/nouvelle"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenNewDemande user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/demande/:id"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenDemandeDetail user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/rendez-vous"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenRendezVous user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/actes"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenActes user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/assistant-ia"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenAiAssistant user={user} token={token} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/profil"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenProfile user={user} token={token} onLogout={handleLogout} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/citoyen/parametres"
              element={
                user ? (
                  <CitizenLayout user={user} onLogout={handleLogout}>
                    <ErrorBoundary>
                      <CitizenProfile user={user} token={token} onLogout={handleLogout} />
                    </ErrorBoundary>
                  </CitizenLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </ToastProvider>
  );
}
