// Adapter to bridge professional SniperX Prime with existing wallet setup
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import bs58 from "bs58";

let cachedConnection: Connection | null = null;
let cachedWallet: Keypair | null = null;

export function conn(): Connection {
  if (!cachedConnection) {
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    cachedConnection = new Connection(rpcUrl, "confirmed");
  }
  return cachedConnection;
}

export function loadWallet(): Keypair {
  if (!cachedWallet) {
    cachedWallet = loadWalletFromConfiguredSources();
  }
  return cachedWallet;
}

export async function getBalance(pubkey: string): Promise<number> {
  const { PublicKey } = await import("@solana/web3.js");
  const lamports = await conn().getBalance(new PublicKey(pubkey), "confirmed");
  return lamports / 1e9;
}

function loadWalletFromConfiguredSources(): Keypair {
  const defaultPath = path.resolve("./phantom_key.json");
  const configuredPathRaw = process.env.WALLET_PRIVATE_KEY_PATH?.trim();
  const configuredPath = configuredPathRaw ? path.resolve(configuredPathRaw) : undefined;

  const pathsToTry =
    configuredPath && configuredPath !== defaultPath
      ? [configuredPath, defaultPath]
      : [configuredPath || defaultPath];

  for (const walletPath of pathsToTry) {
    try {
      const secretKey = parseJsonWalletFile(walletPath);
      return keypairFromSecret(secretKey, `wallet file (${walletPath})`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT" && walletPath !== pathsToTry[pathsToTry.length - 1]) {
        continue;
      }
      throw sanitizeWalletLoadError(error, walletPath);
    }
  }

  const base58Secret = process.env.WALLET_PRIVATE_KEY_BASE58?.trim();
  if (base58Secret) {
    try {
      const secretKey = new Uint8Array(bs58.decode(base58Secret));
      return keypairFromSecret(secretKey, "WALLET_PRIVATE_KEY_BASE58");
    } catch (error) {
      throw new Error("Wallet load failed: WALLET_PRIVATE_KEY_BASE58 is invalid.");
    }
  }

  throw new Error(
    `Wallet load failed: no key file found. Set WALLET_PRIVATE_KEY_PATH (default: ${defaultPath}) or provide WALLET_PRIVATE_KEY_BASE58.`
  );
}

function parseJsonWalletFile(walletPath: string): Uint8Array {
  const raw = fs.readFileSync(walletPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Wallet file is not valid JSON: ${walletPath}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Wallet file must be a JSON byte array: ${walletPath}`);
  }
  const bytes = parsed.map((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Wallet file contains non-byte values: ${walletPath}`);
    }
    return value;
  });
  return new Uint8Array(bytes);
}

function keypairFromSecret(secretKey: Uint8Array, sourceLabel: string): Keypair {
  if (secretKey.length === 64) {
    return Keypair.fromSecretKey(secretKey);
  }
  if (secretKey.length === 32) {
    return Keypair.fromSeed(secretKey);
  }
  throw new Error(
    `Wallet load failed: ${sourceLabel} has invalid secret length (${secretKey.length}); expected 32 or 64 bytes.`
  );
}

function sanitizeWalletLoadError(error: unknown, walletPath: string): Error {
  const err = error as NodeJS.ErrnoException;
  if (err?.code === "ENOENT") {
    return new Error(`Wallet file not found at: ${walletPath}`);
  }
  return new Error(
    `Wallet load failed for path ${walletPath}: ${error instanceof Error ? error.message : "unknown error"}`
  );
}

export function resetWalletCacheForTests(): void {
  cachedWallet = null;
  cachedConnection = null;
}