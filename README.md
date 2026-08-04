# Arcticwallet Tangem Connector

Prototype of an embeddable EVM vault widget for using Tangem as cold storage while an exchange application requests bounded withdrawals without asking the card to sign every transfer.

## Model

Tangem signs setup and funding transactions through WalletConnect. The deployed `ArcticVault` delegates narrowly limited withdrawals to an operator key held by the relayer. The contract enforces token, recipient, per-transaction and daily limits on-chain. The iframe never receives the operator private key.

This is an experimental prototype and has not been audited. Do not use it with production funds.

## Repository

- `packages/contracts` — Hardhat contracts and TypeScript tests.
- `apps/widget` — iframe React widget using Reown AppKit and WalletConnect.
- `apps/relayer` — server-side bounded withdrawal endpoint.
- `packages/widget-sdk` — host application's typed `postMessage` helper.

## Run

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm test
pnpm dev
```

Create a Reown project and set `VITE_REOWN_PROJECT_ID`. Deploy `ArcticVaultFactory`, then set `VITE_FACTORY_ADDRESS`. Keep `OPERATOR_PRIVATE_KEY` only on the relayer server.

## Intended flow

1. The iframe connects Tangem using WalletConnect.
2. Tangem signs one transaction that creates a vault with an operator and limits.
3. The user funds the vault with an allowed ERC-20.
4. The host application asks its backend to authorize an amount and recipient.
5. The backend calls the relayer.
6. The relayer submits `withdraw`; the vault applies all limits and replay protection.
7. Tangem can pause the vault, rotate the operator, change policy or recover funds.

## Current contract policy

- ERC-20 allowlist.
- Recipient allowlist.
- Per-transaction limit.
- UTC-day aggregate limit.
- Unique `requestId` replay protection.
- Owner pause and direct recovery.
- Operator rotation.

The relayer endpoint currently contains an explicit placeholder for merchant authorization. Production use requires verified orders, durable idempotency storage, rate limiting and a KMS/HSM-backed operator signer.
