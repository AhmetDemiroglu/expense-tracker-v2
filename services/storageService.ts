import { db } from "../firebaseConfig";
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { Transaction, UserSettings, CycleSummary, BudgetPeriod, RecurringTransaction } from "../types";
import { addWeeks, addMonths, addYears, parseISO, format } from "date-fns";

const GUEST_PREFIX = "guest_";

export const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
    // GUEST MODE
    if (userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`tx_${userId}`);
        return stored ? JSON.parse(stored) : [];
    }

    // FIREBASE MODE
    try {
        const q = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("date", "desc"));

        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(
            (doc) =>
                ({
                    id: doc.id,
                    ...doc.data(),
                } as Transaction)
        );
    } catch (e) {
        console.error("Error fetching transactions:", e);
        return [];
    }
};

export const addTransaction = async (transaction: Omit<Transaction, "id">): Promise<Transaction> => {
    // GUEST MODE
    if (transaction.userId.startsWith(GUEST_PREFIX)) {
        const transactions = await fetchTransactions(transaction.userId);
        const newTx = { ...transaction, id: crypto.randomUUID() };
        const updatedList = [newTx, ...transactions];
        localStorage.setItem(`tx_${transaction.userId}`, JSON.stringify(updatedList));
        return newTx;
    }

    // FIREBASE MODE
    try {
        const docRef = await addDoc(collection(db, "transactions"), transaction);
        return { id: docRef.id, ...transaction };
    } catch (e) {
        console.error("Error adding transaction:", e);
        throw e;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await deleteDoc(doc(db, "transactions", id));
    } catch (e) {
        console.error("Error deleting transaction:", e);
    }
};

export const deleteGuestTransaction = (userId: string, txId: string, currentList: Transaction[]) => {
    const newList = currentList.filter((t) => t.id !== txId);
    localStorage.setItem(`tx_${userId}`, JSON.stringify(newList));
    return newList;
};

// --- User Settings & Active Period ---

export const saveUserSettings = async (settings: UserSettings) => {
    // GUEST MODE
    if (settings.userId.startsWith(GUEST_PREFIX)) {
        localStorage.setItem(`settings_${settings.userId}`, JSON.stringify(settings));
        return;
    }

    // FIREBASE MODE
    try {
        await setDoc(doc(db, "settings", settings.userId), settings);
    } catch (e) {
        console.error("Error saving settings:", e);
        throw e;
    }
};

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    // GUEST MODE
    if (userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`settings_${userId}`);
        return stored ? JSON.parse(stored) : null;
    }

    // FIREBASE MODE
    try {
        const docRef = await getDoc(doc(db, "settings", userId));
        if (docRef.exists()) {
            return docRef.data() as UserSettings;
        }
        return null;
    } catch (e) {
        console.error("Error getting settings:", e);
        return null;
    }
};

// --- Budget Periods (CRUD) ---

export const fetchBudgetPeriods = async (userId: string): Promise<BudgetPeriod[]> => {
    // GUEST MODE
    if (userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`periods_${userId}`);
        return stored ? JSON.parse(stored) : [];
    }

    // FIREBASE MODE
    try {
        const q = query(collection(db, "budget_periods"), where("userId", "==", userId), orderBy("startDate", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BudgetPeriod));
    } catch (e) {
        console.error("Error fetching periods", e);
        return [];
    }
};

export const saveBudgetPeriod = async (period: Omit<BudgetPeriod, "id"> & { id?: string }) => {
    // GUEST MODE
    if (period.userId.startsWith(GUEST_PREFIX)) {
        const periods = await fetchBudgetPeriods(period.userId);
        let updatedList;
        const newId = period.id || crypto.randomUUID();
        const periodWithId = { ...period, id: newId };

        const existingIndex = periods.findIndex((p) => p.id === period.id);
        if (existingIndex >= 0) {
            updatedList = periods.map((p) => (p.id === period.id ? (periodWithId as BudgetPeriod) : p));
        } else {
            updatedList = [periodWithId as BudgetPeriod, ...periods];
        }

        localStorage.setItem(`periods_${period.userId}`, JSON.stringify(updatedList));
        return newId;
    }

    // FIREBASE MODE
    try {
        if (period.id) {
            const { id, ...data } = period;
            await setDoc(doc(db, "budget_periods", id), data);
            return id;
        } else {
            const docRef = await addDoc(collection(db, "budget_periods"), period);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving period", e);
        throw e;
    }
};

export const deleteBudgetPeriod = async (userId: string, periodId: string) => {
    // GUEST MODE
    if (userId.startsWith(GUEST_PREFIX)) {
        const periods = await fetchBudgetPeriods(userId);
        const filtered = periods.filter((p) => p.id !== periodId);
        localStorage.setItem(`periods_${userId}`, JSON.stringify(filtered));
        return;
    }

    // FIREBASE MODE
    try {
        await deleteDoc(doc(db, "budget_periods", periodId));
    } catch (e) {
        console.error("Error deleting period", e);
    }
};

export const calculateHistorySummaries = (transactions: Transaction[], periods: BudgetPeriod[]): CycleSummary[] => {
    if (periods.length === 0) return [];
    const sortedPeriods = [...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return sortedPeriods.map((period) => {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        end.setHours(23, 59, 59, 999);

        const cycleTxs = transactions.filter((t) => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const txIncome = cycleTxs.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
        const txExpense = cycleTxs.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);

        const totalIncome = txIncome + period.monthlyIncome;
        const totalExpense = txExpense + period.fixedExpenses;

        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

        return {
            id: period.id,
            name: period.name,
            startDate: period.startDate,
            endDate: period.endDate,
            totalIncome,
            totalExpense,
            balance,
            savingsRate,
        };
    });
};

export const addRecurringTransaction = async (data: Omit<RecurringTransaction, "id">) => {
    if (data.userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`recurring_${data.userId}`);
        const currentList: RecurringTransaction[] = stored ? JSON.parse(stored) : [];
        const newRec = { ...data, id: crypto.randomUUID() };
        localStorage.setItem(`recurring_${data.userId}`, JSON.stringify([...currentList, newRec]));
        return newRec;
    }

    try {
        const docRef = await addDoc(collection(db, "recurring_transactions"), data);
        return { id: docRef.id, ...data };
    } catch (e) {
        console.error("Error adding recurring tx:", e);
        throw e;
    }
};

export const fetchRecurringTransactions = async (userId: string): Promise<RecurringTransaction[]> => {
    if (userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`recurring_${userId}`);
        return stored ? JSON.parse(stored) : [];
    }

    try {
        const q = query(collection(db, "recurring_transactions"), where("userId", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecurringTransaction));
    } catch (e) {
        console.error("Error fetching recurring:", e);
        return [];
    }
};

export const processRecurringTransactions = async (userId: string) => {
    const recurringList = await fetchRecurringTransactions(userId);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    let newTransactionsCount = 0;

    for (const rec of recurringList) {
        if (!rec.isActive) continue;

        if (rec.nextDueDate <= todayStr) {
            console.log(`Processing Recurring Tx: ${rec.description}`);

            const newTx: Omit<Transaction, "id"> = {
                userId: rec.userId,
                description: `${rec.description} (Otomatik)`,
                amount: rec.amount,
                type: rec.type,
                category: rec.category,
                date: rec.nextDueDate,
                createdAt: Date.now(),
            };

            await addTransaction(newTx);
            newTransactionsCount++;

            let nextDateObj = parseISO(rec.nextDueDate);
            switch (rec.frequency) {
                case "weekly":
                    nextDateObj = addWeeks(nextDateObj, 1);
                    break;
                case "monthly":
                    nextDateObj = addMonths(nextDateObj, 1);
                    break;
                case "yearly":
                    nextDateObj = addYears(nextDateObj, 1);
                    break;
            }
            const nextDateStr = format(nextDateObj, "yyyy-MM-dd");

            if (userId.startsWith(GUEST_PREFIX)) {
                const stored = localStorage.getItem(`recurring_${userId}`);
                if (stored) {
                    const list = JSON.parse(stored) as RecurringTransaction[];
                    const updatedList = list.map((item) => (item.id === rec.id ? { ...item, nextDueDate: nextDateStr, lastProcessedDate: todayStr } : item));
                    localStorage.setItem(`recurring_${userId}`, JSON.stringify(updatedList));
                }
            } else {
                await updateDoc(doc(db, "recurring_transactions", rec.id), {
                    nextDueDate: nextDateStr,
                    lastProcessedDate: todayStr,
                });
            }
        }
    }

    return newTransactionsCount;
};

export const updateTransaction = async (transaction: Transaction) => {
    // GUEST MODE
    if (transaction.userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`tx_${transaction.userId}`);
        if (stored) {
            const list = JSON.parse(stored) as Transaction[];
            const updatedList = list.map((t) => (t.id === transaction.id ? transaction : t));
            localStorage.setItem(`tx_${transaction.userId}`, JSON.stringify(updatedList));
        }
        return;
    }

    try {
        const txRef = doc(db, "transactions", transaction.id);
        await updateDoc(txRef, { ...transaction });
    } catch (e) {
        console.error("Error updating transaction:", e);
        throw e;
    }
};

export const updateRecurringTransaction = async (recurring: RecurringTransaction) => {
    if (recurring.userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`recurring_${recurring.userId}`);
        if (stored) {
            const list = JSON.parse(stored) as RecurringTransaction[];
            const updatedList = list.map((item) => (item.id === recurring.id ? recurring : item));
            localStorage.setItem(`recurring_${recurring.userId}`, JSON.stringify(updatedList));
        }
        return;
    }

    try {
        const recRef = doc(db, "recurring_transactions", recurring.id);
        await updateDoc(recRef, { ...recurring });
    } catch (e) {
        console.error("Error updating recurring tx:", e);
        throw e;
    }
};

export const deleteRecurringTransaction = async (userId: string, id: string) => {
    if (userId.startsWith(GUEST_PREFIX)) {
        const stored = localStorage.getItem(`recurring_${userId}`);
        if (stored) {
            const list = JSON.parse(stored) as RecurringTransaction[];
            const filteredList = list.filter((item) => item.id !== id);
            localStorage.setItem(`recurring_${userId}`, JSON.stringify(filteredList));
        }
        return;
    }

    try {
        await deleteDoc(doc(db, "recurring_transactions", id));
    } catch (e) {
        console.error("Error deleting recurring tx:", e);
        throw e;
    }
};
