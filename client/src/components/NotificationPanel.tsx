import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Clock, CalendarPlus, ShieldCheck, ShieldX, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { apiRequest } from '../lib/api';

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    metadata?: Record<string, any>;
};

const ICON_MAP: Record<string, React.ReactNode> = {
    booking_pending: <CalendarPlus size={16} className="text-warning" />,
    booking_approved: <ShieldCheck size={16} className="text-success" />,
    booking_rejected: <ShieldX size={16} className="text-error" />,
    booking_deleted: <Trash2 size={16} className="text-error" />,
    general: <Bell size={16} className="text-brand" />,
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

const NotificationPanel: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await apiRequest<{ count: number }>('/api/admin/notifications/unread-count', { auth: true });
            setUnreadCount(data.count);
        } catch {
            // silently fail
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiRequest<Notification[]>('/api/admin/notifications', { auth: true });
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.is_read).length);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll unread count every 30s
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Fetch full list when panel opens
    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAsRead = async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        try {
            await apiRequest(`/api/admin/notifications/${id}/read`, { method: 'PATCH', auth: true });
        } catch {
            // revert on failure
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try {
            await apiRequest('/api/admin/notifications/read-all', { method: 'PATCH', auth: true });
        } catch {
            fetchNotifications();
        }
    };

    return (
        <div className="relative" ref={ref}>
            <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full glass hover:bg-white/60 dark:hover:bg-black/40 transition-all"
                onClick={() => setOpen(!open)}
            >
                <Bell size={20} className="text-textSecondary" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-error text-white text-[10px] font-bold px-1 border-2 border-white dark:border-gray-900"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </Button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-[360px] sm:w-[400px] max-h-[480px] rounded-2xl border border-borderSoft bg-popover shadow-[0_16px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_64px_rgba(0,0,0,0.5)] z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-borderSoft">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-textPrimary">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold bg-brand/15 text-brand px-1.5 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-brand hover:text-brandLink font-medium px-2 py-1 rounded-lg hover:bg-brand/10 transition-colors cursor-pointer"
                                    >
                                        <CheckCheck size={14} className="inline mr-1" />
                                        Read all
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1 rounded-lg text-textMuted hover:text-textPrimary hover:bg-hoverSoft transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            {loading && notifications.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-5 w-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-textMuted">
                                    <Bell size={32} className="mb-2 opacity-30" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((n, i) => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className={`
                                                flex items-start gap-3 px-4 py-3 border-b border-borderSoft/50 cursor-pointer
                                                transition-colors duration-150 group
                                                ${!n.is_read
                                                    ? 'bg-brand/5 hover:bg-brand/10'
                                                    : 'hover:bg-hoverSoft'
                                                }
                                            `}
                                            onClick={() => !n.is_read && markAsRead(n.id)}
                                        >
                                            <div className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-hoverSoft">
                                                {ICON_MAP[n.type] || ICON_MAP.general}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-textPrimary truncate">
                                                        {n.title}
                                                    </span>
                                                    {!n.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-textMuted mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1 text-[11px] text-textMuted/70">
                                                    <Clock size={10} />
                                                    <span>{timeAgo(n.created_at)}</span>
                                                </div>
                                            </div>
                                            {!n.is_read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(n.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-textMuted hover:text-success hover:bg-success/10 shrink-0 cursor-pointer"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationPanel;
