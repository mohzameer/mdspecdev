
import { useState, useRef, useEffect } from 'react';

interface CommentInputProps {
    onSubmit: (content: string) => Promise<void>;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export function CommentInput({
    onSubmit,
    placeholder = 'Write a comment...',
    className = '',
    autoFocus = false,
}: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content);
            setContent('');
        } catch (error) {
            console.error('Failed to submit comment', error);
            // Error handling could be improved with a toast notification
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`flex flex-col gap-2 ${className}`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full min-h-[80px] p-3 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                disabled={isSubmitting}
            />
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!content.trim() || isSubmitting}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
}
