
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';

interface MentionNotification {
    id: string;
    created_at: string;
    read: boolean;
    comment: {
        id: string;
        body: string;
        author: {
            full_name: string;
            avatar_url: string | null;
        };
        thread: {
            id: string;
            anchor_heading_id: string;
            spec: {
                id: string;
                name: string;
                slug: string;
                project: {
                    slug: string;
                    org: {
                        slug: string;
                    }
                }
            }
        }
    };
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<MentionNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    // Poll for notifications every minute
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mentionIds: unreadIds }),
            });
            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
    };

    const handleBellClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            markAsRead();
        }
    };

    const handleNotificationClick = (notification: MentionNotification) => {
        setIsOpen(false);
        const { slug: projectSlug, org } = notification.comment.thread.spec.project;
        const spec = notification.comment.thread.spec;
        // Navigate to the spec page with the comment hash or similar
        // For now just spec page, maybe anchor later if we support deep linking to comment
        router.push(`/${org.slug}/${projectSlug}/${spec.slug}`);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors relative"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {notifications.map(notification => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {notification.comment.author.avatar_url ? (
                                                    <img src={notification.comment.author.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                        {notification.comment.author.full_name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                                    <span className="font-medium">{notification.comment.author.full_name}</span> mentioned you in
                                                    <span className="font-medium ml-1">{notification.comment.thread.spec.name}</span>
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                                    "{notification.comment.body}"
                                                </p>
                                                <p className="text-xs text-slate-400 mt-2">
                                                    {formatRelativeTime(notification.created_at)}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
