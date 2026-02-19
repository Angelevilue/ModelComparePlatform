export {};

declare global {
  interface Window {
    electronAPI?: {
      readModelsConfig: () => Promise<any[] | null>;
      writeModelsConfig: (config: any[]) => Promise<boolean>;
      getAppPath: () => Promise<string>;
    };
  }
}
