'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}

// Re-export useTheme hook for compatibility if used elsewhere, 
// though direct import from next-themes is preferred.
import { useTheme as useNextTheme } from 'next-themes';
export const useTheme = useNextTheme;
