import { createAppKit } from "@reown/appkit/react";
import { baseSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [baseSepolia],
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [baseSepolia],
  projectId,
  metadata: {
    name: "Arcticwallet Tangem Connector",
    description: "Create and fund a bounded spending vault",
    url: window.location.origin,
    icons: [],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
});
