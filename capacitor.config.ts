import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.fintel.app",
    appName: "Fintel",
    webDir: "dist",
    server: {
        androidScheme: "https",
    },
    plugins: {
        GoogleAuth: {
            scopes: ["profile", "email"],
            clientId: "774300681132-sdog76j4aspnfr321obgkcve5qmcaipt.apps.googleusercontent.com",
            forceCodeForRefreshToken: false,
        },
    },
};

export default config;
