import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.fintel.app",
    appName: "Fintel",
    webDir: "dist",
    server: {
        androidScheme: "https",
    },
};

export default config;
