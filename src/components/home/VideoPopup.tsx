'use client';

import { useState } from 'react';

// I'll check if I can use lucide-react or if I need inline SVGs.
// User didn't say I can add lucide-react now. I previously used inline SVGs.
// I'll stick to inline SVGs for consistency unless I see lucide-react is installed.
// Checking package.json via `view_file` earlier didn't explicitly show it, but I used `lucide-react` imports in plans.
// Actually, earlier `grep_search` failed on .antigravityignore, but showed files.
// I'll check package.json again quickly if I can, but to be safe I'll use inline SVGs.
// Re-reading context: I used inline SVGs for the buttons in step 123. So lucide-react is PROBABLY NOT installed.
// I will use inline SVGs.

export function VideoPopup() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleModal = () => setIsOpen(!isOpen);

    return (
        <>
            <button
                onClick={toggleModal}
                className="px-8 py-4 w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-3 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 text-lg shadow-sm group"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors"
                >
                    <path d="M8 5v14l11-7z" />
                </svg>
                <span>How it works?</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 aspect-video">
                        <button
                            onClick={toggleModal}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
                            aria-label="Close video"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <div className="w-full h-full">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/wDchsz8nmbo?autoplay=1&mute=1"
                                title="How it works video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            ></iframe>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={toggleModal}></div>
                </div>
            )}
        </>
    );
}
