import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { z } from "zod";

const env = z
  .object({
    RPC_URL: z.string().url(),
    OPERATOR_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    PORT: z.coerce.number().default(8787),
  })
  .parse(process.env);

const withdrawalSchema = z.object({
  vault: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  token: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  recipient: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amount: z.string().regex(/^\d+$/),
  requestId: z.string().min(1).max(128),
  authorization: z.string().min(16),
});

const vaultAbi = [
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "requestId", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

const account = privateKeyToAccount(
  env.OPERATOR_PRIVATE_KEY as `0x${string}`,
);
const transport = http(env.RPC_URL);
const publicClient = createPublicClient({ chain: baseSepolia, transport });
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport,
});

const app = Fastify({ logger: true });
await app.register(cors, { origin: false });

app.get("/health", async () => ({ ok: true, operator: account.address }));

app.post("/v1/withdrawals", async (request, reply) => {
  const body = withdrawalSchema.parse(request.body);

  // Production must verify the merchant authorization server-side before signing.
  const args = [
    body.token as `0x${string}`,
    body.recipient as `0x${string}`,
    BigInt(body.amount),
    keccak256(stringToHex(body.requestId)),
  ] as const;

  const { request: transaction } = await publicClient.simulateContract({
    account,
    address: body.vault as `0x${string}`,
    abi: vaultAbi,
    functionName: "withdraw",
    args,
  });

  const hash = await walletClient.writeContract(transaction);
  return reply.code(202).send({ requestId: body.requestId, hash });
});

await app.listen({ host: "0.0.0.0", port: env.PORT });
