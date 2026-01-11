import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "info" | "success";
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({
        title: "",
        message: "",
        confirmText: "Onayla",
        cancelText: "İptal",
        variant: "danger"
    });

    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions({
            confirmText: "Evet",
            cancelText: "Vazgeç",
            variant: "danger",
            ...opts,
        });
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        resolveRef.current(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        resolveRef.current(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 transform transition-all animate-fade-in-up">

                        <div className="mb-4">
                            {options.variant === "danger" && (
                                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
                                    <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                            )}
                            {options.variant === "info" && (
                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto">
                                    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-white mb-2">{options.title}</h3>
                            <p className="text-slate-400 text-sm">{options.message}</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors active:scale-95"
                            >
                                {options.cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 py-3 px-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${options.variant === "danger"
                                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                                    }`}
                            >
                                {options.confirmText}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
};