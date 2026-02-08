
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CommentInputProps {
    onSubmit: (content: string, mentions: string[]) => Promise<void>;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    orgSlug: string;
}

interface UserSuggestion {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
}

export function CommentInput({
    onSubmit,
    placeholder = 'Write a comment... (use @ to mention)',
    className = '',
    autoFocus = false,
    orgSlug,
}: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(new Set());

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    // Search users when mention query changes
    useEffect(() => {
        // Allow search on empty query if we are just starting to type mention
        if (mentionQuery !== null) {
            const searchUsers = async () => {
                const res = await fetch(`/api/users/search?q=${mentionQuery}&orgSlug=${orgSlug}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setShowSuggestions(true);
                }
            };
            const timer = setTimeout(searchUsers, 300);
            return () => clearTimeout(timer);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [mentionQuery, orgSlug]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        setContent(val);
        setCursorPosition(pos);

        // Detect @ mention
        const textBeforeCursor = val.slice(0, pos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            // Check if there are spaces between @ and cursor, if not, it's a potential mention
            const query = textBeforeCursor.slice(lastAtPos + 1);
            if (!/\s/.test(query)) {
                setMentionQuery(query);
                return; // It's a valid mention attempt
            }
        }

        setMentionQuery(null);
        setShowSuggestions(false);
    };

    const handleSelectUser = (user: UserSuggestion) => {
        const textBeforeCursor = content.slice(0, cursorPosition);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = content.slice(cursorPosition);

        const newText = content.slice(0, lastAtPos) + `@${user.full_name} ` + textAfterCursor;
        setContent(newText);
        setShowSuggestions(false);
        setMentionedUserIds(prev => new Set(prev).add(user.id));

        // Reset focus
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content, Array.from(mentionedUserIds));
            setContent('');
            setMentionedUserIds(new Set());
        } catch (error) {
            console.error('Failed to submit comment:', error);
            // Error handling could be improved with a toast notification
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {suggestions.map(user => (
                        <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                    {user.full_name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSubmit();
                        }
                    }}
                    placeholder={placeholder}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none text-sm"
                    rows={3}
                    disabled={isSubmitting}
                    autoFocus={autoFocus}
                />
            </div>
            <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400 hidden sm:inline">
                    {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'} + Enter to submit
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
                >
                    {isSubmitting ? 'Sending...' : 'Comment'}
                </button>
            </div>
        </div>
    );
}
