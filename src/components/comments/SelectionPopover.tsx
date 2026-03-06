'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface SelectionPopoverProps {
    containerRef: React.RefObject<HTMLElement | null>;
    onComment: (selectedText: string, nearestHeadingId: string) => void;
    isReadOnly?: boolean;
}

export function SelectionPopover({ containerRef, onComment, isReadOnly = false }: SelectionPopoverProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [selectedText, setSelectedText] = useState('');
    const [nearestHeadingId, setNearestHeadingId] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const findNearestHeadingId = useCallback((node: Node): string => {
        let current: Node | null = node;

        // Walk up the DOM to find the nearest section-container with a heading
        while (current && current !== containerRef.current) {
            if (current instanceof HTMLElement) {
                // Check if this is a section-container
                if (current.classList.contains('section-container')) {
                    const heading = current.querySelector('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
                    if (heading) return heading.id;
                }
                // Also check if the element itself is a heading
                if (/^H[1-6]$/.test(current.tagName) && current.id) {
                    return current.id;
                }
            }
            current = current.parentNode;
        }

        // Fallback: find the last heading before this node in DOM order
        if (containerRef.current) {
            const allHeadings = containerRef.current.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
            let lastHeadingId = '';
            for (const heading of allHeadings) {
                const comparison = node.compareDocumentPosition(heading);
                if (comparison & Node.DOCUMENT_POSITION_FOLLOWING) break;
                lastHeadingId = heading.id;
            }
            return lastHeadingId;
        }

        return 'general';
    }, [containerRef]);

    const handleSelectionChange = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                // Do not auto-hide here if they just clicked inside the popover
                // but we should hide if they clear selection elsewhere.
                // The mousedown handler handles standard dismiss.
                return;
            }

            // Check if selection is within our container
            const container = containerRef.current;
            if (!container) return;

            const anchorNode = selection.anchorNode;
            const focusNode = selection.focusNode;
            if (!anchorNode || !focusNode) return;

            if (!container.contains(anchorNode) || !container.contains(focusNode)) return;

            const text = selection.toString().trim();
            if (!text) return;

            // Get position for popover
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Increase offset on mobile devices to prevent OS text selection menus from overlapping
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const yOffset = isMobile ? 82 : 44;

            setPosition({
                top: rect.top - containerRect.top - yOffset,
                left: rect.left - containerRect.left + (rect.width / 2),
            });

            setSelectedText(text);
            setNearestHeadingId(findNearestHeadingId(anchorNode));
            setIsVisible(true);
        }, 300); // 300ms debounce allows handles to settle on mobile
    }, [containerRef, findNearestHeadingId]);

    const handleMouseDown = useCallback((e: MouseEvent | TouchEvent | Event) => {
        // Don't dismiss if clicking the popover itself
        if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
            return;
        }
        setIsVisible(false);
    }, []);

    const handleScroll = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        if (isReadOnly) return; // Don't attach listeners if read-only

        const container = containerRef.current;
        if (!container) return;

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('touchstart', handleMouseDown, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('touchstart', handleMouseDown);
            window.removeEventListener('scroll', handleScroll);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [containerRef, handleSelectionChange, handleMouseDown, handleScroll, isReadOnly]);

    const handleCommentClick = () => {
        onComment(selectedText, nearestHeadingId);
        setIsVisible(false);
        // Clear selection
        window.getSelection()?.removeAllRanges();
    };

    if (!isVisible || isReadOnly) return null;

    return (
        <div
            ref={popoverRef}
            className="absolute z-50 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translateX(-50%)',
            }}
        >
            <div className="bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-xl px-3 py-2 flex items-center gap-2 whitespace-nowrap">
                <button
                    onClick={handleCommentClick}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-blue-300 transition-colors cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Comment
                </button>
            </div>
        </div>
    );
}
