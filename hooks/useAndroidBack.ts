import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

interface BackHandlerProps {
    isFormOpen: boolean;
    setIsFormOpen: (val: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: any) => void;
}

export const useAndroidBack = ({ isFormOpen, setIsFormOpen, activeTab, setActiveTab }: BackHandlerProps) => {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const backButtonListener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
            if (isFormOpen) {
                setIsFormOpen(false);
                return;
            }

            if (activeTab !== "dashboard") {
                setActiveTab("dashboard");
                return;
            }

            CapacitorApp.exitApp();
        });

        return () => {
            backButtonListener.then((listener) => listener.remove());
        };
    }, [isFormOpen, activeTab, setIsFormOpen, setActiveTab]);
};
