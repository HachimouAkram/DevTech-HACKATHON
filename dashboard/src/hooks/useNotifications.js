import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      const list = data?.data?.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.lu).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time synchronization via Server-Sent Events (SSE)
    const eventSourceUrl = api.getStreamUrl('/realtime/stream');
    const eventSource = new EventSource(eventSourceUrl);

    eventSource.addEventListener("refresh_notifications", (event) => {
      console.log("Real-time update received: refresh notifications", event.data);
      fetchNotifications();
    });

    eventSource.onerror = () => {
      console.log("Real-time connection temporary loss or reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    notifications,
    unreadCount,
    markAllRead,
    markAsRead
  };
};

export default useNotifications;
