import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

const RPC_URL       = process.env.RPC_URL || 'https://api.devnet.solana.com';
const EXPLORER_BASE = 'https://solscan.io';
const MEMO_PROGRAM  = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface StorageResult {
  rootHash:    string;
  explorerUrl: string;
  success:     boolean;
  error?:      string;
  demo?:       boolean;
}

function loadKeypair(): Keypair | null {
  try {
    if (process.env.SOLANA_KEYPAIR_BASE64) {
      const secret = JSON.parse(
        Buffer.from(process.env.SOLANA_KEYPAIR_BASE64, 'base64').toString('utf8')
      );
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    }
    const keypairPath = process.env.WALLET_KEYPAIR_PATH ||
      `${os.homedir()}/.config/solana/id.json`;
    const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch {
    return null;
  }
}

export async function uploadPickToStorage(pickData: object): Promise<StorageResult> {
  const keypair  = loadKeypair();
  const jsonStr  = JSON.stringify(pickData);
  const rootHash = crypto.createHash('sha256').update(jsonStr).digest('hex');

  if (!keypair) {
    return {
      rootHash:    `demo-${rootHash.slice(0, 32)}`,
      explorerUrl: '',
      success:     false,
      demo:        true,
      error:       'Keypair not configured',
    };
  }

  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    const memoIx = new TransactionInstruction({
      keys:      [],
      programId: MEMO_PROGRAM,
      data:      Buffer.from(`watchitlive:pick:${rootHash}`),
    });

    const tx = new Transaction().add(memoIx);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');

    tx.recentBlockhash      = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer             = keypair.publicKey;
    tx.sign(keypair);

    // Send without waiting for confirmation — return sig immediately
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });

    // Confirm in background (fire and forget)
    connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed'
    ).catch(() => {});

    return {
      rootHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${sig}?cluster=devnet`,
      success:     true,
      demo:        false,
    };
  } catch (err) {
    return {
      rootHash,
      explorerUrl: '',
      success:     false,
      demo:        true,
      error:       err instanceof Error ? err.message : 'TX failed',
    };
  }
}
