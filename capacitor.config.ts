// capacitor.config.ts
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.fintel.app",
    appName: "Fintel",
    webDir: "dist",
    server: {
        androidScheme: "https",
    },
    plugins: {
        SocialLogin: {
            google: {
                webClientId: "774300681132-sdog76j4aspnfr321obgkcve5qmcaipt.apps.googleusercontent.com",
                androidClientId: "774300681132-sau6h95p86d85489e4uq4lnchc58730a.apps.googleusercontent.com",
                iosClientId: "IOS_CLIENT_ID.apps.googleusercontent.com",
                mode: "online",
            },
        },
    },
};

export default config;
