import React, { useState, useRef } from "react";
import { clsx } from "clsx";

interface OnboardingSliderProps {
    onComplete: () => void;
}

interface Slide {
    id: number;
    title: string;
    description: string;
    illustration: React.ReactNode;
    gradient: string;
    accentColor: string;
}

// --- SVG ILLUSTRATIONS ---
const WelcomeIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
        {/* Background Circle */}
        <circle cx="100" cy="100" r="80" fill="url(#welcomeGrad)" opacity="0.15" />

        {/* Floating Coins */}
        <g className="animate-float-slow">
            <circle cx="60" cy="70" r="18" fill="#facc15" />
            <text x="60" y="75" textAnchor="middle" fill="#854d0e" fontSize="16" fontWeight="bold">₺</text>
        </g>
        <g className="animate-float-medium" style={{ animationDelay: "0.5s" }}>
            <circle cx="140" cy="60" r="14" fill="#a3e635" />
            <text x="140" y="65" textAnchor="middle" fill="#365314" fontSize="12" fontWeight="bold">₺</text>
        </g>
        <g className="animate-float-fast" style={{ animationDelay: "1s" }}>
            <circle cx="150" cy="130" r="12" fill="#38bdf8" />
            <text x="150" y="135" textAnchor="middle" fill="#0c4a6e" fontSize="10" fontWeight="bold">₺</text>
        </g>

        {/* Phone/App Icon */}
        <rect x="75" y="85" width="50" height="80" rx="8" fill="#1e293b" stroke="#6366f1" strokeWidth="2" />
        <rect x="80" y="95" width="40" height="50" rx="4" fill="#0f172a" />

        {/* Chart Lines on Phone */}
        <path d="M85 130 L95 120 L105 125 L115 110" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Sparkles */}
        <g fill="#818cf8">
            <circle cx="45" cy="110" r="3" className="animate-pulse" />
            <circle cx="155" cy="90" r="2" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
            <circle cx="50" cy="140" r="2" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
        </g>

        <defs>
            <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
        </defs>
    </svg>
);

const BudgetIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
        {/* Background */}
        <circle cx="100" cy="100" r="80" fill="url(#budgetGrad)" opacity="0.15" />

        {/* Calendar Base */}
        <rect x="50" y="60" width="100" height="90" rx="10" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
        <rect x="50" y="60" width="100" height="25" rx="10" fill="#10b981" />
        <rect x="50" y="75" width="100" height="10" fill="#10b981" />

        {/* Calendar Hooks */}
        <rect x="70" y="52" width="8" height="16" rx="3" fill="#0f172a" />
        <rect x="122" y="52" width="8" height="16" rx="3" fill="#0f172a" />

        {/* Calendar Text */}
        <text x="100" y="75" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">ARALIK 2025</text>

        {/* Calendar Days */}
        <g fill="#64748b" fontSize="8">
            <text x="62" y="100">1</text>
            <text x="78" y="100">2</text>
            <text x="94" y="100">3</text>
            <text x="110" y="100">4</text>
            <text x="126" y="100">5</text>
        </g>

        {/* Highlighted Day */}
        <circle cx="94" cy="97" r="8" fill="#10b981" opacity="0.3" />

        {/* Money Stack */}
        <g className="animate-float-slow">
            <rect x="130" y="115" width="35" height="20" rx="3" fill="#22c55e" />
            <rect x="133" y="112" width="35" height="20" rx="3" fill="#4ade80" />
            <rect x="136" y="109" width="35" height="20" rx="3" fill="#86efac" />
            <text x="153" y="122" textAnchor="middle" fill="#14532d" fontSize="10" fontWeight="bold">₺₺₺</text>
        </g>

        {/* Arrow showing period */}
        <path d="M60 140 L140 140" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="60" cy="140" r="4" fill="#10b981" />
        <circle cx="140" cy="140" r="4" fill="#10b981" />

        <defs>
            <linearGradient id="budgetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
        </defs>
    </svg>
);

const DailyLimitIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
        {/* Background */}
        <circle cx="100" cy="100" r="80" fill="url(#limitGrad)" opacity="0.15" />

        {/* Wallet */}
        <rect x="55" y="70" width="90" height="70" rx="12" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
        <rect x="55" y="70" width="90" height="25" rx="12" fill="#f59e0b" />
        <rect x="55" y="85" width="90" height="10" fill="#f59e0b" />
        <circle cx="130" cy="82" r="6" fill="#fbbf24" />

        {/* Money peeking out */}
        <rect x="65" y="95" width="50" height="35" rx="4" fill="#22c55e" />
        <text x="90" y="117" textAnchor="middle" fill="#14532d" fontSize="14" fontWeight="bold">₺250</text>

        {/* Progress Arc */}
        <path
            d="M 100 160 A 50 50 0 0 1 50 110"
            stroke="#334155"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
        />
        <path
            d="M 100 160 A 50 50 0 0 1 65 125"
            stroke="#22c55e"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className="animate-progress"
        />

        {/* Daily Label */}
        <rect x="60" y="165" width="80" height="24" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="100" y="181" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">GÜNLÜK LİMİT</text>

        {/* Sparkle */}
        <g fill="#fbbf24" className="animate-pulse">
            <circle cx="155" cy="70" r="4" />
            <circle cx="45" cy="130" r="3" />
        </g>

        <defs>
            <linearGradient id="limitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
        </defs>
    </svg>
);

const NovaAIIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
        {/* Background */}
        <circle cx="100" cy="100" r="80" fill="url(#novaGrad)" opacity="0.15" />

        {/* Nova Avatar Circle */}
        <circle cx="100" cy="85" r="40" fill="#1e293b" stroke="#8b5cf6" strokeWidth="3" />

        {/* Nova Face - Friendly Robot */}
        <circle cx="85" cy="80" r="6" fill="#a78bfa" className="animate-pulse" />
        <circle cx="115" cy="80" r="6" fill="#a78bfa" className="animate-pulse" style={{ animationDelay: "0.5s" }} />
        <path d="M85 95 Q100 105 115 95" stroke="#a78bfa" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Antenna */}
        <line x1="100" y1="45" x2="100" y2="35" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="100" cy="32" r="5" fill="#c4b5fd" className="animate-pulse" />

        {/* Chat Bubbles */}
        <g className="animate-float-slow">
            <rect x="140" y="60" width="45" height="25" rx="8" fill="#8b5cf6" />
            <polygon points="140,75 145,85 150,75" fill="#8b5cf6" />
            <text x="162" y="77" textAnchor="middle" fill="white" fontSize="8">Analiz</text>
        </g>

        <g className="animate-float-medium" style={{ animationDelay: "0.3s" }}>
            <rect x="15" y="80" width="45" height="25" rx="8" fill="#6366f1" />
            <polygon points="60,95 55,105 50,95" fill="#6366f1" />
            <text x="37" y="97" textAnchor="middle" fill="white" fontSize="8">Öneri</text>
        </g>

        {/* Data Visualization Lines */}
        <g stroke="#8b5cf6" strokeWidth="1" opacity="0.5">
            <path d="M60 140 L80 130 L100 145 L120 125 L140 140" fill="none" />
        </g>

        {/* Bottom Label */}
        <rect x="55" y="155" width="90" height="28" rx="14" fill="#0f172a" stroke="#8b5cf6" strokeWidth="1" />
        <text x="100" y="173" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="bold">NOVA AI</text>

        <defs>
            <linearGradient id="novaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
        </defs>
    </svg>
);

const ReadyIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56">
        {/* Background */}
        <circle cx="100" cy="100" r="80" fill="url(#readyGrad)" opacity="0.15" />

        {/* Rocket */}
        <g className="animate-float-slow">
            {/* Rocket Body */}
            <ellipse cx="100" cy="95" rx="20" ry="45" fill="#e2e8f0" />
            <ellipse cx="100" cy="95" rx="15" ry="40" fill="#f8fafc" />

            {/* Rocket Tip */}
            <path d="M85 55 L100 30 L115 55" fill="#ef4444" />

            {/* Window */}
            <circle cx="100" cy="80" r="10" fill="#0ea5e9" />
            <circle cx="100" cy="80" r="6" fill="#38bdf8" />

            {/* Wings */}
            <path d="M80 110 L60 130 L80 125 Z" fill="#6366f1" />
            <path d="M120 110 L140 130 L120 125 Z" fill="#6366f1" />

            {/* Fire */}
            <ellipse cx="100" cy="145" rx="12" ry="20" fill="#f97316" className="animate-pulse" />
            <ellipse cx="100" cy="145" rx="8" ry="15" fill="#facc15" className="animate-pulse" />
        </g>

        {/* Stars */}
        <g fill="#fbbf24">
            <polygon points="45,60 47,66 53,66 48,70 50,76 45,72 40,76 42,70 37,66 43,66" className="animate-pulse" />
            <polygon points="155,80 156,84 160,84 157,87 158,91 155,88 152,91 153,87 150,84 154,84" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
            <polygon points="50,140 51,143 54,143 52,145 53,148 50,146 47,148 48,145 46,143 49,143" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
        </g>

        {/* Checkmark Badge */}
        <circle cx="145" cy="145" r="20" fill="#22c55e" />
        <path d="M135 145 L143 153 L157 137" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Confetti */}
        <g opacity="0.8">
            <rect x="30" y="90" width="6" height="6" fill="#f472b6" transform="rotate(30 33 93)" />
            <rect x="165" y="100" width="5" height="5" fill="#a78bfa" transform="rotate(-20 167 102)" />
            <rect x="40" y="160" width="4" height="4" fill="#4ade80" transform="rotate(45 42 162)" />
            <rect x="155" y="55" width="5" height="5" fill="#38bdf8" transform="rotate(15 157 57)" />
        </g>

        <defs>
            <linearGradient id="readyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
        </defs>
    </svg>
);

// --- SLIDE DATA ---
const slides: Slide[] = [
    {
        id: 1,
        title: "Fintel'e Hoş Geldin",
        description: "Akıllı bütçe asistanın artık cebinde. Harcamalarını kontrol altına al, finansal hedeflerine ulaş.",
        illustration: <WelcomeIllustration />,
        gradient: "from-indigo-600 to-violet-600",
        accentColor: "indigo",
    },
    {
        id: 2,
        title: "Dönemini Oluştur",
        description: "Maaş dönemin, tatil bütçen veya özel hedeflerin için ayrı dönemler tanımla. Her dönem bağımsız takip edilir.",
        illustration: <BudgetIllustration />,
        gradient: "from-emerald-600 to-teal-600",
        accentColor: "emerald",
    },
    {
        id: 3,
        title: "Günlük Limitini Gör",
        description: "Her sabah bugün ne kadar harcayabileceğini bil. Fintel, kalan bütçeni kalan güne bölerek sana rehber olur.",
        illustration: <DailyLimitIllustration />,
        gradient: "from-amber-500 to-orange-500",
        accentColor: "amber",
    },
    {
        id: 4,
        title: "Nova ile Tanış",
        description: "Yapay zeka danışmanın Nova, harcamalarını analiz eder ve sana özel tasarruf önerileri sunar.",
        illustration: <NovaAIIllustration />,
        gradient: "from-violet-600 to-purple-600",
        accentColor: "violet",
    },
    {
        id: 5,
        title: "Hazırsın!",
        description: "Şimdi ilk dönemini oluştur ve finansal kontrolü ele al. Başarıya giden yolda Fintel yanında.",
        illustration: <ReadyIllustration />,
        gradient: "from-green-500 to-emerald-500",
        accentColor: "green",
    },
];

export const OnboardingSlider: React.FC<OnboardingSliderProps> = ({ onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentSlide = slides[currentIndex];
    const isLastSlide = currentIndex === slides.length - 1;

    // Swipe handlers
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < slides.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleNext = () => {
        if (isLastSlide) {
            handleComplete();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        localStorage.setItem("fintel_onboarding_completed", "true");
        onComplete();
    };

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Skip Button */}
            {!isLastSlide && (
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 z-10 px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors safe-top"
                >
                    Atla
                </button>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
                {/* Illustration */}
                <div
                    className={clsx(
                        "relative mb-8 transition-all duration-500 ease-out",
                        "transform"
                    )}
                    key={currentSlide.id}
                >
                    {/* Glow Effect */}
                    <div
                        className={clsx(
                            "absolute inset-0 blur-3xl opacity-30 rounded-full",
                            `bg-gradient-to-br ${currentSlide.gradient}`
                        )}
                    />
                    <div className="relative animate-fade-in">
                        {currentSlide.illustration}
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center max-w-sm animate-fade-in" key={`text-${currentSlide.id}`}>
                    <h1
                        className={clsx(
                            "text-2xl md:text-3xl font-bold mb-4 bg-clip-text text-transparent",
                            `bg-gradient-to-r ${currentSlide.gradient}`
                        )}
                    >
                        {currentSlide.title}
                    </h1>
                    <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                        {currentSlide.description}
                    </p>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="px-6 pb-8 safe-bottom">
                {/* Dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            onClick={() => handleDotClick(index)}
                            className={clsx(
                                "h-2 rounded-full transition-all duration-300",
                                index === currentIndex
                                    ? `w-8 bg-gradient-to-r ${currentSlide.gradient}`
                                    : "w-2 bg-slate-700 hover:bg-slate-600"
                            )}
                            aria-label={`Slide ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleNext}
                    className={clsx(
                        "w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition-all active:scale-95",
                        `bg-gradient-to-r ${currentSlide.gradient}`,
                        isLastSlide ? "shadow-green-500/30" : "shadow-indigo-500/30"
                    )}
                >
                    {isLastSlide ? "Başlayalım!" : "Devam Et"}
                </button>

                {/* Page Indicator */}
                <p className="text-center text-slate-600 text-xs mt-4">
                    {currentIndex + 1} / {slides.length}
                </p>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes float-fast {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes progress {
                    0% { stroke-dasharray: 0 100; }
                    100% { stroke-dasharray: 60 100; }
                }
                .animate-float-slow {
                    animation: float-slow 3s ease-in-out infinite;
                }
                .animate-float-medium {
                    animation: float-medium 2.5s ease-in-out infinite;
                }
                .animate-float-fast {
                    animation: float-fast 2s ease-in-out infinite;
                }
                .animate-progress {
                    animation: progress 1.5s ease-out forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .safe-top {
                    padding-top: env(safe-area-inset-top, 16px);
                }
                .safe-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 32px);
                }
            `}</style>
        </div>
    );
};

export default OnboardingSlider;