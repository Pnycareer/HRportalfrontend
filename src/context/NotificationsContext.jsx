import React from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

const NotificationsContext = React.createContext(null);

const SOCKET_EVENTS = {
  NEW_LEAVE: "leave:new",
};

const MAX_NOTIFICATIONS = 25;

const createDefaultState = () => ({
  notifications: [],
  unreadCount: 0,
  lastEvent: null,
});

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function NotificationsProvider({ children }) {
  const { user, initializing } = useAuth();
  const socketRef = React.useRef(null);
  const [state, setState] = React.useState(() => createDefaultState());

  React.useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE;
    if (!baseUrl) return undefined;

    const socket = io(baseUrl, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });

    const handleNewLeave = (payload) => {
      setState((prev) => {
        const notification = {
          ...payload,
          id: uniqueId(),
          leaveId: payload?.leaveId || null,
          receivedAt: new Date().toISOString(),
          read: false,
        };

        const deduped = prev.notifications.filter(
          (item) => item.leaveId !== notification.leaveId
        );
        const notifications = [notification, ...deduped].slice(
          0,
          MAX_NOTIFICATIONS
        );

        return {
          notifications,
          unreadCount: prev.unreadCount + 1,
          lastEvent: { type: SOCKET_EVENTS.NEW_LEAVE, payload: notification },
        };
      });
    };

    socket.on(SOCKET_EVENTS.NEW_LEAVE, handleNewLeave);
    socketRef.current = socket;

    return () => {
      socket.off(SOCKET_EVENTS.NEW_LEAVE, handleNewLeave);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (initializing) return;

    const isTeamLead = Boolean(user?.isTeamLead);

    if (!user || !isTeamLead) {
      if (socket.connected) {
        socket.disconnect();
      }
      setState(createDefaultState());
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }
  }, [user, initializing]);

  const markAllAsRead = React.useCallback(() => {
    setState((prev) => ({
      notifications: prev.notifications.map((item) => ({
        ...item,
        read: true,
      })),
      unreadCount: 0,
      lastEvent: prev.lastEvent,
    }));
  }, []);

  const dismissNotification = React.useCallback((id) => {
    setState((prev) => {
      const notifications = prev.notifications.filter((item) => item.id !== id);
      const unreadCount = notifications.reduce(
        (total, item) => (item.read ? total : total + 1),
        0
      );
      return {
        notifications,
        unreadCount,
        lastEvent: prev.lastEvent,
      };
    });
  }, []);

  const value = React.useMemo(
    () => ({
      socket: socketRef.current,
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      lastEvent: state.lastEvent,
      markAllAsRead,
      dismissNotification,
    }),
    [state, markAllAsRead, dismissNotification]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
