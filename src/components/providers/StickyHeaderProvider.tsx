'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface StickyHeaderContextType {
    title: string | null;
    subtitle: string | null;
    isVisible: boolean;
    setTitle: (title: string | null) => void;
    setSubtitle: (subtitle: string | null) => void;
    setIsVisible: (isVisible: boolean) => void;
}

const StickyHeaderContext = createContext<StickyHeaderContextType | undefined>(undefined);

export function StickyHeaderProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState<string | null>(null);
    const [subtitle, setSubtitle] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    return (
        <StickyHeaderContext.Provider value={{ title, subtitle, isVisible, setTitle, setSubtitle, setIsVisible }}>
            {children}
        </StickyHeaderContext.Provider>
    );
}

export function useStickyHeader() {
    const context = useContext(StickyHeaderContext);
    if (!context) {
        throw new Error('useStickyHeader must be used within a StickyHeaderProvider');
    }
    return context;
}
