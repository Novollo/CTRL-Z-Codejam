// The few Chrome extension APIs we use, typed by hand (no extra npm package needed).
declare namespace chrome {
  namespace runtime {
    interface Port {
      name: string;
      postMessage(message: unknown): void;
      disconnect(): void;
      onMessage: { addListener(cb: (message: any, port: Port) => void): void };
      onDisconnect: { addListener(cb: (port: Port) => void): void };
    }
    function connect(info: { name: string }): Port;
    const onConnect: { addListener(cb: (port: Port) => void): void };
    const lastError: { message?: string } | undefined;
  }
  namespace storage {
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }
    const local: {
      get(keys: string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    const onChanged: { addListener(cb: (changes: Record<string, StorageChange>, area: string) => void): void };
  }
}

declare module "*.webp" {
  const dataUrl: string;
  export default dataUrl;
}
