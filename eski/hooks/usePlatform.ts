import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

export const usePlatform = () => {
    const [platform, setPlatform] = useState<"web" | "android" | "ios">("web");
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        const currentPlatform = Capacitor.getPlatform();
        setPlatform(currentPlatform as "web" | "android" | "ios");
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    return {
        platform,
        isNative,
        isWeb: !isNative,
        isAndroid: platform === "android",
        isIOS: platform === "ios",
    };
};
