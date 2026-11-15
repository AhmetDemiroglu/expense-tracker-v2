// Yalnız geliştirme (.env.development.local, import.meta.env.DEV): VITE_AI_SAHTE=1 iken AI istemcisi sunucuya gitmez, örnek yanıt döner.
interface ImportMetaEnv {
  readonly VITE_AI_SAHTE?: string;
}
