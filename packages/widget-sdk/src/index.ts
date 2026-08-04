export type ArcticWidgetCommand =
  | {
      type: "ARCTIC_INIT";
      payload: { merchantId: string; vault?: `0x${string}` };
    }
  | {
      type: "ARCTIC_REQUEST_WITHDRAWAL";
      payload: {
        requestId: string;
        token: `0x${string}`;
        recipient: `0x${string}`;
        amount: string;
      };
    };

export type ArcticWidgetEvent =
  | { type: "ARCTIC_READY" }
  | { type: "ARCTIC_CONNECTED"; payload: { address: `0x${string}` } }
  | {
      type: "ARCTIC_VAULT_CREATED";
      payload: { vault: `0x${string}`; txHash: `0x${string}` };
    }
  | {
      type: "ARCTIC_WITHDRAWAL_STATUS";
      payload: {
        requestId: string;
        status: "submitted" | "confirmed" | "failed";
        txHash?: `0x${string}`;
        error?: string;
      };
    };

export class ArcticWidgetClient {
  constructor(
    private readonly frame: HTMLIFrameElement,
    private readonly origin: string,
  ) {}

  send(command: ArcticWidgetCommand): void {
    this.frame.contentWindow?.postMessage(command, this.origin);
  }

  subscribe(listener: (event: ArcticWidgetEvent) => void): () => void {
    const handler = (event: MessageEvent<ArcticWidgetEvent>) => {
      if (
        event.origin === this.origin &&
        event.source === this.frame.contentWindow
      ) {
        listener(event.data);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }
}
