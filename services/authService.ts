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
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";

export const loginWithGoogle = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            const googleUser = await GoogleAuth.signIn();

            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
            const result = await signInWithCredential(auth, credential);
            return result.user;
        } else {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return result.user;
        }
    } catch (error) {
        console.error("Login failed", error);
        throw error;
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
