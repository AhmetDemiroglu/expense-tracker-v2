import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)} 
                        className={`
              pointer-events-auto cursor-pointer min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border flex items-center gap-3 transform transition-all duration-300 animate-slide-in
              ${toast.type === "success" ? "bg-slate-900 border-emerald-500/50 text-emerald-400" : ""}
              ${toast.type === "error" ? "bg-slate-900 border-rose-500/50 text-rose-400" : ""}
              ${toast.type === "warning" ? "bg-slate-900 border-amber-500/50 text-amber-400" : ""}
              ${toast.type === "info" ? "bg-slate-900 border-indigo-500/50 text-indigo-400" : ""}
            `}
                    >
                        {/* Icon */}
                        <div
                            className={`p-2 rounded-full bg-opacity-10 shrink-0
                ${toast.type === "success" ? "bg-emerald-500" : ""}
                ${toast.type === "error" ? "bg-rose-500" : ""}
                ${toast.type === "warning" ? "bg-amber-500" : ""}
                ${toast.type === "info" ? "bg-indigo-500" : ""}
            `}
                        >
                            {toast.type === "success" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {toast.type === "error" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            {toast.type === "warning" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            )}
                            {toast.type === "info" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>

                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
