import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const factoryAbi = [
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "perTransactionLimit", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
    ],
    outputs: [{ name: "vault", type: "address" }],
  },
] as const;

const parentOrigin = import.meta.env.VITE_PARENT_ORIGIN || "*";

export function App() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [operator, setOperator] = useState("");
  const [perTransactionLimit, setPerTransactionLimit] = useState("100");
  const [dailyLimit, setDailyLimit] = useState("500");
  const [status, setStatus] = useState(
    "Подключите Tangem через WalletConnect",
  );

  useEffect(() => {
    window.parent.postMessage({ type: "ARCTIC_READY" }, parentOrigin);

    if (address) {
      window.parent.postMessage(
        { type: "ARCTIC_CONNECTED", payload: { address } },
        parentOrigin,
      );
    }
  }, [address]);

  const createVault = async () => {
    try {
      const hash = await writeContractAsync({
        address: import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}`,
        abi: factoryAbi,
        functionName: "createVault",
        args: [
          operator as `0x${string}`,
          parseUnits(perTransactionLimit, 6),
          parseUnits(dailyLimit, 6),
        ],
      });

      setStatus(`Транзакция отправлена: ${hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ошибка транзакции");
    }
  };

  return (
    <main>
      <header>
        <div>
          <small>ARCTICWALLET</small>
          <h1>Cold Vault</h1>
        </div>
        <appkit-button />
      </header>

      <section className="card">
        <h2>Создать контейнер</h2>
        <p>
          Одна подпись Tangem создаёт vault. Дальнейшие выдачи ограничивает сам
          контракт.
        </p>

        <label>
          Адрес relayer-оператора
          <input
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
            placeholder="0x…"
          />
        </label>

        <div className="grid">
          <label>
            Лимит одной операции, USDC
            <input
              value={perTransactionLimit}
              onChange={(event) => setPerTransactionLimit(event.target.value)}
            />
          </label>

          <label>
            Суточный лимит, USDC
            <input
              value={dailyLimit}
              onChange={(event) => setDailyLimit(event.target.value)}
            />
          </label>
        </div>

        <button
          disabled={!isConnected || isPending || !operator}
          onClick={createVault}
        >
          {isPending ? "Подтверждение…" : "Создать vault"}
        </button>

        <output>{status}</output>
      </section>

      <section className="notice">
        <strong>Важно:</strong> iframe не хранит ключ оператора. Пополнение
        выполняется обычным переводом токена на адрес vault.
      </section>
    </main>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "appkit-button": Record<string, never>;
    }
  }
}
