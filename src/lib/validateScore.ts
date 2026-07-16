import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const RPC_URL    = process.env.RPC_URL || 'https://api.devnet.solana.com';
const API_BASE   = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT        = process.env.TXLINE_JWT || '';
const TOKEN      = process.env.TXLINE_API_TOKEN || '';
const PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');

const IDL = {
  address: '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
  metadata: { name: 'txoracle', version: '1.5.2', spec: '0.1.0' },
  instructions: [{
    name: 'validateStat',
    discriminator: [107, 197, 232, 90, 191, 136, 105, 185],
    accounts: [{ name: 'dailyScoresMerkleRoots', writable: false, signer: false }],
    args: [
      { name: 'ts',             type: 'i64' },
      { name: 'fixtureSummary', type: { defined: { name: 'ScoresBatchSummary' } } },
      { name: 'fixtureProof',   type: { vec: { defined: { name: 'ProofNode' } } } },
      { name: 'mainTreeProof',  type: { vec: { defined: { name: 'ProofNode' } } } },
      { name: 'predicate',      type: { defined: { name: 'TraderPredicate' } } },
      { name: 'statA',          type: { defined: { name: 'StatTerm' } } },
      { name: 'statB',          type: { option: { defined: { name: 'StatTerm' } } } },
      { name: 'op',             type: { option: { defined: { name: 'BinaryExpression' } } } },
    ],
    returns: 'bool',
  }],
  accounts: [], events: [], errors: [],
  types: [
    { name: 'ScoresBatchSummary', type: { kind: 'struct', fields: [
      { name: 'fixtureId',        type: 'i64' },
      { name: 'updateStats',      type: { defined: { name: 'ScoresUpdateStats' } } },
      { name: 'eventsSubTreeRoot',type: { array: ['u8', 32] } },
    ]}},
    { name: 'ScoresUpdateStats', type: { kind: 'struct', fields: [
      { name: 'updateCount',  type: 'i32' },
      { name: 'minTimestamp', type: 'i64' },
      { name: 'maxTimestamp', type: 'i64' },
    ]}},
    { name: 'ProofNode', type: { kind: 'struct', fields: [
      { name: 'hash',           type: { array: ['u8', 32] } },
      { name: 'isRightSibling', type: 'bool' },
    ]}},
    { name: 'TraderPredicate', type: { kind: 'struct', fields: [
      { name: 'threshold',  type: 'i32' },
      { name: 'comparison', type: { defined: { name: 'Comparison' } } },
    ]}},
    { name: 'Comparison', type: { kind: 'enum', variants: [
      { name: 'GreaterThan' }, { name: 'LessThan' }, { name: 'EqualTo' },
    ]}},
    { name: 'StatTerm', type: { kind: 'struct', fields: [
      { name: 'statToProve',   type: { defined: { name: 'ScoreStat' } } },
      { name: 'eventStatRoot', type: { array: ['u8', 32] } },
      { name: 'statProof',     type: { vec: { defined: { name: 'ProofNode' } } } },
    ]}},
    { name: 'ScoreStat', type: { kind: 'struct', fields: [
      { name: 'key',    type: 'u32' },
      { name: 'value',  type: 'i32' },
      { name: 'period', type: 'i32' },
    ]}},
    { name: 'BinaryExpression', type: { kind: 'enum', variants: [
      { name: 'Add' }, { name: 'Subtract' },
    ]}},
  ],
} as any;

export interface ValidationResult {
  valid:       boolean;
  fixtureId:   string;
  homeGoals?:  number;
  awayGoals?:  number;
  timestamp?:  string;
  pdaAddress?: string;
  solscanUrl?: string;
  error?:      string;
  demo?:       boolean;
}

export async function validateScoreOnChain(fixtureId: string): Promise<ValidationResult> {
  try {
    // Step 1: Fetch stat-validation proof from TxLINE
    const headers = {
      'Authorization': `Bearer ${JWT}`,
      'X-Api-Token':   TOKEN,
    };

    // First get recent score updates to find a valid seq
    const now       = new Date();
    const targetTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago
    const epochDay  = Math.floor(targetTime.getTime() / 86400000);
    const hourOfDay = targetTime.getUTCHours();
    const interval  = Math.floor(targetTime.getUTCMinutes() / 5);

    const updatesRes = await fetch(
      `${API_BASE}/api/scores/updates/${epochDay}/${hourOfDay}/${interval}`,
      { headers }
    );

    if (!updatesRes.ok) {
      return { valid: false, fixtureId, error: 'Score updates not available yet', demo: true };
    }

    const updates = await updatesRes.json();
    const fixtureUpdates = (Array.isArray(updates) ? updates : [])
      .filter((u: any) => String(u.fixtureId) === String(fixtureId));

    if (fixtureUpdates.length === 0) {
      return { valid: false, fixtureId, error: 'No score data found for this fixture', demo: true };
    }

    const lastUpdate = fixtureUpdates[fixtureUpdates.length - 1];
    const seq        = lastUpdate.seq || lastUpdate.Seq;

    // Step 2: Fetch Merkle proof — statKey 1 = home goals, 2 = away goals
    const validationRes = await fetch(
      `${API_BASE}/api/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKey=1&statKey2=2`,
      { headers }
    );

    if (!validationRes.ok) {
      return { valid: false, fixtureId, error: 'Merkle proof unavailable', demo: true };
    }

    const validation = await validationRes.json();

    // Step 3: Call validateStat on-chain (read-only simulation)
    const connection = new Connection(RPC_URL, 'confirmed');

    // Derive dummy wallet for read-only provider
    const dummyKeypair = anchor.web3.Keypair.generate();
    const wallet       = { publicKey: dummyKeypair.publicKey, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs };
    const provider     = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program      = new anchor.Program(IDL, provider);

    const targetTs = validation.summary.updateStats.minTimestamp;
    const eDay     = Math.floor(targetTs / (24 * 60 * 60 * 1000));

    const [dailyScoresPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('daily_scores_roots'), new BN(eDay).toBuffer('le', 2)],
      PROGRAM_ID
    );

    const fixtureSummary = {
      fixtureId:        new BN(validation.summary.fixtureId),
      updateStats: {
        updateCount:  validation.summary.updateStats.updateCount,
        minTimestamp: new BN(validation.summary.updateStats.minTimestamp),
        maxTimestamp: new BN(validation.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: validation.summary.eventStatsSubTreeRoot,
    };

    const fixtureProof  = validation.subTreeProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling }));
    const mainTreeProof = validation.mainTreeProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling }));

    const stat1 = {
      statToProve:   validation.statToProve,
      eventStatRoot: validation.eventStatRoot,
      statProof:     validation.statProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling })),
    };

    const stat2 = validation.statToProve2 ? {
      statToProve:   validation.statToProve2,
      eventStatRoot: validation.eventStatRoot2 || validation.eventStatRoot,
      statProof:     (validation.statProof2 || []).map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling })),
    } : null;

    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });

    const isValid = await program.methods
      .validateStat(
        new BN(targetTs),
        fixtureSummary,
        fixtureProof,
        mainTreeProof,
        { threshold: 0, comparison: { greaterThan: {} } },
        stat1,
        stat2,
        null
      )
      .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
      .preInstructions([computeBudgetIx])
      .view();

    return {
      valid:      isValid,
      fixtureId,
      homeGoals:  validation.statToProve?.value,
      awayGoals:  validation.statToProve2?.value,
      timestamp:  new Date(targetTs).toISOString(),
      pdaAddress: dailyScoresPda.toBase58(),
      solscanUrl: `https://solscan.io/account/${dailyScoresPda.toBase58()}?cluster=devnet`,
    };

  } catch (err) {
    return {
      valid:    false,
      fixtureId,
      error:    err instanceof Error ? err.message : 'Validation failed',
      demo:     true,
    };
  }
}
