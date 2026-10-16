import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Chatbot from './Chatbot';

export const Layout = ({ user, onLogout, children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        user={user} 
        sidebarCollapsed={sidebarCollapsed} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        onLogout={onLogout} 
      />
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        <Topbar 
          user={user} 
          sidebarCollapsed={sidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
          onLogout={onLogout} 
        />
        <main className={`main-content ${sidebarCollapsed ? 'main-content-expanded' : ''}`}>
          {children}
        </main>
      </div>
      <Chatbot user={user} />
    </div>
  );
};

export default Layout;
