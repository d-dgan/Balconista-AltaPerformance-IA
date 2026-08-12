import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTour } from '../contexts/TourContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function InteractiveTour() {
    const { isActive, currentTour, currentStepIndex, nextStep, prevStep, endTour, autoStartDisabled, setAutoStartDisabled } = useTour();
    const { t } = useLanguage();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (!isActive || !currentTour) return;

        const currentStep = currentTour.steps[currentStepIndex];
        const element = document.querySelector(currentStep.target);

        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            // Scroll element into view if not visible
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Calculate tooltip position
            const padding = 12;
            let top = 0;
            let left = 0;
            let transform = '';

            const position = currentStep.position || 'bottom';

            switch (position) {
                case 'bottom':
                    top = rect.bottom + padding;
                    left = rect.left + rect.width / 2;
                    transform = 'translateX(-50%)';
                    break;
                case 'top':
                    top = rect.top - padding;
                    left = rect.left + rect.width / 2;
                    transform = 'translate(-50%, -100%)';
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + padding;
                    transform = 'translateY(-50%)';
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - padding;
                    transform = 'translate(-100%, -50%)';
                    break;
                case 'center':
                    top = window.innerHeight / 2;
                    left = window.innerWidth / 2;
                    transform = 'translate(-50%, -50%)';
                    break;
            }

            // Adjust if out of bounds
            if (left < 20) left = 20;
            if (left > window.innerWidth - 320) left = window.innerWidth - 320;
            if (top < 20) top = 20;
            if (top > window.innerHeight - 200) top = window.innerHeight - 200;

            setTooltipStyles({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                transform,
                zIndex: 10000,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            });
        } else {
            console.warn(`Tour target not found: ${currentStep.target}`);
            setTargetRect(null);
        }
    }, [isActive, currentTour, currentStepIndex]);

    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        
        // Execute step action if present
        if (isActive && currentTour) {
            const step = currentTour.steps[currentStepIndex];
            if (step.action) {
                step.action();
                // Delay position update to allow UI to settle after action
                setTimeout(updatePosition, 100);
            }
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [updatePosition, currentStepIndex, isActive, currentTour]);

    if (!isActive || !currentTour) return null;

    const currentStep = currentTour.steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === currentTour.steps.length - 1;

    return (
        <div className="fixed inset-0 z-9999 pointer-events-none overflow-hidden">
            {/* SVG Overlay with hole */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                <defs>
                    <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="12"
                                fill="black"
                                className="transition-all duration-300"
                            />
                        )}
                    </mask>
                    <style>{`
                        @keyframes tour-pulse {
                            0% { stroke-width: 2px; stroke-opacity: 1; filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.5)); }
                            50% { stroke-width: 4px; stroke-opacity: 0.6; filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.8)); }
                            100% { stroke-width: 2px; stroke-opacity: 1; filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.5)); }
                        }
                        .tour-pulse-border {
                            animation: tour-pulse 2s infinite ease-in-out;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        }
                    `}</style>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%" height="100%"
                    fill="rgba(0, 0, 0, 0.80)"
                    mask="url(#tour-mask)"
                    className="backdrop-blur-xs transition-all duration-500"
                    onClick={endTour}
                />
                {targetRect && (
                    <rect
                        x={targetRect.left - 8}
                        y={targetRect.top - 8}
                        width={targetRect.width + 16}
                        height={targetRect.height + 16}
                        rx="12"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        className="tour-pulse-border pointer-events-none"
                    />
                )}
            </svg>

            {/* Tooltip Card */}
            <div
                ref={tooltipRef}
                style={tooltipStyles}
                className="w-[320px] glass-panel rounded-2xl p-5 border border-white/20 shadow-2xl pointer-events-auto fade-in shadow-indigo-500/10"
            >
                <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                        {t('Passo', 'Step')} {currentStepIndex + 1} / {currentTour.steps.length}
                    </span>
                    <button
                        onClick={endTour}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={14} className="opacity-50" />
                    </button>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 leading-tight">
                    {currentStep.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-4">
                    {currentStep.description}
                </p>

                {/* Auto-start Toggle */}
                <div className="flex items-center gap-2 mb-6 pointer-events-auto">
                    <input
                        type="checkbox"
                        id="tour-auto-start-toggle"
                        checked={autoStartDisabled}
                        onChange={(e) => setAutoStartDisabled(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer"
                    />
                    <label 
                        htmlFor="tour-auto-start-toggle" 
                        className="text-[10px] font-medium text-slate-500 dark:text-white/40 cursor-pointer hover:text-slate-700 dark:hover:text-white/60 transition-colors"
                    >
                        {t('Não exibir guias automaticamente', "Don't show guides automatically")}
                    </label>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {!isFirstStep && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold transition-all cursor-pointer border border-white/5"
                            >
                                <ChevronLeft size={14} /> {t('Voltar', 'Back')}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={nextStep}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                    >
                        {isLastStep ? t('Finalizar', 'Finish') : t('Próximo', 'Next')}
                        {!isLastStep && <ChevronRight size={14} />}
                    </button>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/10 w-full overflow-hidden rounded-b-2xl">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${((currentStepIndex + 1) / currentTour.steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
