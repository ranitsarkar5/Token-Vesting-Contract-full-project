import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from "@stellar/stellar-sdk/contract";
import type { u64, i128 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CA5JV2CQWQJCLEC32LGOS4OSHM543DM4LPJHEI7NNG6HS3CSD7S2VJJB";
    };
};
export interface VestingPlan {
    beneficiary: string;
    cliff_duration: u64;
    created_at: u64;
    duration: u64;
    released_amount: i128;
    start_time: u64;
    token: string;
    total_amount: i128;
}
export interface Client {
    /**
     * Construct and simulate a get_plan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Query vesting plan details
     */
    get_plan: ({ plan_id }: {
        plan_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<VestingPlan>>;
    /**
     * Construct and simulate a claim_vested transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Anyone can claim their vested tokens
     */
    claim_vested: ({ plan_id }: {
        plan_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a vested_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Query vested amount (read-only)
     */
    vested_amount: ({ plan_id }: {
        plan_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a get_plan_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Query total number of plans created
     */
    get_plan_count: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>;
    /**
     * Construct and simulate a releasable_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Query releasable amount (read-only)
     */
    releasable_amount: ({ plan_id }: {
        plan_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a create_vesting_plan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * PERMISSIONLESS: Anyone can create a vesting plan
     * Plan ID is auto-generated as counter-based index
     */
    create_vesting_plan: ({ beneficiary, token, total_amount, start_time, duration, cliff_duration }: {
        beneficiary: string;
        token: string;
        total_amount: i128;
        start_time: u64;
        duration: u64;
        cliff_duration: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u64>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        get_plan: (json: string) => AssembledTransaction<VestingPlan>;
        claim_vested: (json: string) => AssembledTransaction<bigint>;
        vested_amount: (json: string) => AssembledTransaction<bigint>;
        get_plan_count: (json: string) => AssembledTransaction<bigint>;
        releasable_amount: (json: string) => AssembledTransaction<bigint>;
        create_vesting_plan: (json: string) => AssembledTransaction<bigint>;
    };
}
