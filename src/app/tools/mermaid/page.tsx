'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import mermaid from 'mermaid';




function MermaidViewer() {
    const searchParams = useSearchParams();
    const storageKey = searchParams.get('key');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storageKey) return;

        let attempts = 0;
        const maxAttempts = 5;

        const loadCode = () => {
            try {
                const storedCode = localStorage.getItem(storageKey);
                console.log(`[MermaidViewer] Attempt ${attempts + 1}: Loading key ${storageKey}, found:`, !!storedCode);

                if (storedCode) {
                    setCode(storedCode);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(loadCode, 100); // Retry every 100ms
                } else {
                    setError('Diagram not found (expired or invalid key). Please try clicking "Visualise" again.');
                }
            } catch (e) {
                console.error('Failed to load code from storage', e);
                setError('Failed to load diagram code');
            }
        };

        loadCode();
    }, [storageKey]);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
        });
    }, []);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!code) return;

            setError(null);
            try {
                const element = document.getElementById('mermaid-preview');
                if (element) {
                    element.innerHTML = '';
                    const id = `mermaid-svg-${Date.now()}`;
                    const { svg } = await mermaid.render(id, code);
                    element.innerHTML = svg;
                    const svgElement = element.querySelector('svg');
                    if (svgElement) {
                        // Extract viewBox dimensions to set natural size
                        const viewBox = svgElement.getAttribute('viewBox');
                        if (viewBox) {
                            const [, , w, h] = viewBox.split(' ').map(Number);
                            svgElement.style.width = `${w}px`;
                            svgElement.style.height = `${h}px`;
                            svgElement.style.maxWidth = 'none';
                        } else {
                            // Fallback if no viewBox
                            svgElement.style.maxWidth = 'none';
                            svgElement.style.width = 'auto'; // Try to let it expand
                            svgElement.style.height = 'auto';
                        }

                        svgElement.removeAttribute('height'); // Remove attribute just in case

                        // Force initial scale to 100%
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                    }
                }
            } catch (err: any) {
                console.error('Mermaid error:', err);
                setError(err.message || 'Failed to render diagram');
            }
        };

        // Small delay to ensure DOM is ready and mermaid is initialized
        const timeoutId = setTimeout(() => {
            renderDiagram();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [code]);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [showSource, setShowSource] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate initial centering on load (optional but helpful)
    useEffect(() => {
        if (!containerRef.current) return;
        // We could calculate center here if we had SVG dimensions, 
        // but sticking to (0,0) and zoom 1 is the most predictable "100%" view.
    }, [code]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.1));
    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Handle wheel events for zoom (pinch) and pan (scroll)
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            // Zoom (pinch or ctrl+wheel)
            e.preventDefault();
            const delta = -e.deltaY * 0.01;
            setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 5));
        } else {
            // Pan
            if (e.deltaX !== 0 || e.deltaY !== 0) {
                e.preventDefault();
            }
            setPan(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    // Mouse drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (!storageKey) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Mermaid Viewer
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        No diagram code provided. Open this tool from a specification to view a diagram.
                    </p>
                    <a
                        href="/dashboard"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden select-none">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <button
                    onClick={handleZoomOut}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <span className="text-sm font-mono text-slate-500 dark:text-slate-400 min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={handleZoomIn}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                    onClick={handleReset}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Reset View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                    onClick={() => setShowSource(!showSource)}
                    className={`p-2 rounded-md transition-colors ${showSource ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="View Source"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                </button>
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-hidden flex items-center justify-center relative overscroll-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                {/* Source Code Overlay */}
                {showSource && (
                    <div className="absolute left-4 top-4 bottom-4 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-auto z-20 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Source Code</h3>
                            <button onClick={() => setShowSource(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap text-slate-600 dark:text-slate-300 flex-1">{code}</pre>
                    </div>
                )}

                {error ? (
                    <div className="max-w-2xl w-full p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 flex flex-col gap-4 z-20">
                        <h3 className="font-semibold text-lg">Failed to render diagram</h3>
                        <pre className="text-sm font-mono whitespace-pre-wrap bg-white/50 dark:bg-black/20 p-4 rounded-lg overflow-auto max-h-60">
                            {error}
                        </pre>
                        <div className="mt-2">
                            <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Source code:</p>
                            <pre className="text-xs font-mono bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-auto max-h-60 text-slate-700 dark:text-slate-300">
                                {code}
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div
                        id="mermaid-preview"
                        className="transition-transform duration-75 ease-out origin-center"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default function MermaidToolPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">Loading viewer...</div>}>
            <MermaidViewer />
        </Suspense>
    );
}
