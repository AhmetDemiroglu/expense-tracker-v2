import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet"; 
import { Capacitor } from "@capacitor/core";

export const selectReceiptImage = async (): Promise<string> => {
    try {
        // 1. DURUM: MOBİL (Native)
        if (Capacitor.isNativePlatform()) {
            const prompt = await ActionSheet.showActions({
                title: "Belge Yükle",
                message: "Fiş veya faturanızı nasıl yüklemek istersiniz?",
                options: [{ title: "Kamerayı Aç / Fotoğraf Çek" }, { title: "PDF veya Dosya Seç" }, { title: "İptal", style: ActionSheetButtonStyle.Cancel }],
            });

            // Seçenek 1: Kamera
            if (prompt.index === 0) {
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: false,
                    resultType: CameraResultType.Base64,
                    source: CameraSource.Prompt,
                });

                if (!image.base64String) throw new Error("Görsel verisi alınamadı");
                return `data:image/${image.format};base64,${image.base64String}`;
            }

            // Seçenek 2: Dosya/PDF Seçici
            if (prompt.index === 1) {
                const result = await FilePicker.pickFiles({
                    types: ["application/pdf", "image/*"],
                    limit: 1,
                    readData: true,
                });

                const file = result.files[0];
                if (!file || !file.data) throw new Error("Dosya verisi alınamadı");

                if (file.data.startsWith("data:")) {
                    return file.data;
                } else {
                    return `data:${file.mimeType};base64,${file.data}`;
                }
            }

            throw new Error("İşlem iptal edildi");
        }

        // 2. DURUM: WEB
        return new Promise((resolve, reject) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*,application/pdf";

            input.onchange = (event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (!file) {
                    reject(new Error("Dosya seçilmedi"));
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    resolve(result);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            };

            input.click();
        });
    } catch (error) {
        console.error("Belge seçimi işlem durumu:", error);
        throw error;
    }
};
