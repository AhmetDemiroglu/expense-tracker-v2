import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
    reauthenticateWithPopup,
    signInWithCredential,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import type { GoogleLoginResponseOnline } from "@capgo/capacitor-social-login";

export const loginWithGoogle = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            const response = await SocialLogin.login({
                provider: "google",
                options: {},
            });

            if (response.provider !== "google") {
                throw new Error("Google login başarısız: provider google değil");
            }

            const result = response.result as GoogleLoginResponseOnline;

            const idToken = result.idToken;
            if (!idToken) {
                throw new Error("Google idToken alınamadı (mode offline olabilir)");
            }

            const credential = GoogleAuthProvider.credential(idToken);
            const userCred = await signInWithCredential(auth, credential);
            return userCred.user;
        } else {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return result.user;
        }
    } catch (err: any) {
        console.error("🔥 GOOGLE LOGIN ERROR:", err);
        console.error("🔥 GOOGLE LOGIN ERROR RAW:", JSON.stringify(err));

        throw err;
    }
};

export const registerWithEmail = async (email: string, pass: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        // Send verification email
        await sendEmailVerification(userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error("Registration failed", error);
        throw error;
    }
};

export const loginWithEmail = async (email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export const createGuestUser = (uid?: string): User => {
    return {
        uid: uid || "guest_" + Math.random().toString(36).substr(2, 9),
        displayName: "Misafir Kullanıcı",
        email: null,
        emailVerified: false,
        isAnonymous: true,
        metadata: {},
        providerData: [],
        refreshToken: "",
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => "",
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
        providerId: "guest",
    } as unknown as User;
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Kullanıcı bulunamadı.");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);
};

export const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
};

export const setInitialPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    try {
        await updatePassword(user, newPassword);
    } catch (error: any) {
        if (error.code === "auth/requires-recent-login") {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
            await updatePassword(user, newPassword);
        } else {
            throw error;
        }
    }
};
