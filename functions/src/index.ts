// Fintel Cloud Functions (2. nesil). Deploy Ahmet'te: functions/DEPLOY-NOTU.md
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { handleAi, type Caller } from "./ai";
import { FUNCTION_TIMEOUT_SECONDS, GEMINI_TIMEOUT_MS, MAX_INSTANCES, REGION } from "./ayarlar";
import { AdminAccountStore } from "./firestoreDepo";
import type { FetchLike } from "./gemini";
import { FirestoreQuotaStore } from "./kota";
import { handleDeleteAccount } from "./silme";

initializeApp();

/** Gemini API anahtarı: Firebase secret. Koda, repoya, günlüğe yazılmaz. */
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

function callerOf(request: CallableRequest): Caller {
  if (!request.auth) return null;
  const firebase = request.auth.token.firebase as { sign_in_provider?: string } | undefined;
  return { uid: request.auth.uid, signInProvider: firebase?.sign_in_provider };
}

const log = {
  info: (msg: string, data?: Record<string, unknown>) => logger.info(msg, data ?? {}),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn(msg, data ?? {}),
};

export const aiProxy = onCall(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: FUNCTION_TIMEOUT_SECONDS,
    maxInstances: MAX_INSTANCES,
    cors: true,
  },
  async (request) => {
    return handleAi(callerOf(request), request.data, {
      quota: new FirestoreQuotaStore(getFirestore()),
      gemini: {
        apiKey: GEMINI_API_KEY.value(),
        fetch: fetch as unknown as FetchLike,
        timeoutMs: GEMINI_TIMEOUT_MS,
        logger: log,
      },
      now: () => new Date(),
    });
  },
);

export const deleteAccount = onCall(
  {
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 300,
    maxInstances: 5,
    cors: true,
  },
  async (request) => {
    const caller = request.auth
      ? { uid: request.auth.uid, authTime: Number(request.auth.token.auth_time) }
      : null;
    return handleDeleteAccount(caller, new AdminAccountStore(getFirestore(), getAuth()), Date.now(), (msg, data) =>
      logger.info(msg, { uid: caller?.uid, ...data }),
    );
  },
);
