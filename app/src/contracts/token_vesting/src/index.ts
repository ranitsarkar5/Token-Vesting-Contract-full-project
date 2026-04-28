import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CA5JV2CQWQJCLEC32LGOS4OSHM543DM4LPJHEI7NNG6HS3CSD7S2VJJB",
  }
} as const


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
  get_plan: ({plan_id}: {plan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<VestingPlan>>

  /**
   * Construct and simulate a claim_vested transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * PERMISSIONLESS: Anyone can claim their vested tokens
   */
  claim_vested: ({plan_id}: {plan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a vested_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * PERMISSIONLESS: Query vested amount (read-only)
   */
  vested_amount: ({plan_id}: {plan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_plan_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * PERMISSIONLESS: Query total number of plans created
   */
  get_plan_count: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a releasable_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * PERMISSIONLESS: Query releasable amount (read-only)
   */
  releasable_amount: ({plan_id}: {plan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a create_vesting_plan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * PERMISSIONLESS: Anyone can create a vesting plan
   * Plan ID is auto-generated as counter-based index
   */
  create_vesting_plan: ({beneficiary, token, total_amount, start_time, duration, cliff_duration}: {beneficiary: string, token: string, total_amount: i128, start_time: u64, duration: u64, cliff_duration: u64}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAAC1Zlc3RpbmdQbGFuAAAAAAgAAAAAAAAAC2JlbmVmaWNpYXJ5AAAAABMAAAAAAAAADmNsaWZmX2R1cmF0aW9uAAAAAAAGAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAAAAAAAD3JlbGVhc2VkX2Ftb3VudAAAAAALAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAADHRvdGFsX2Ftb3VudAAAAAs=",
        "AAAAAAAAACpQRVJNSVNTSU9OTEVTUzogUXVlcnkgdmVzdGluZyBwbGFuIGRldGFpbHMAAAAAAAhnZXRfcGxhbgAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAfQAAAAC1Zlc3RpbmdQbGFuAA==",
        "AAAAAAAAADRQRVJNSVNTSU9OTEVTUzogQW55b25lIGNhbiBjbGFpbSB0aGVpciB2ZXN0ZWQgdG9rZW5zAAAADGNsYWltX3Zlc3RlZAAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAAL",
        "AAAAAAAAAC9QRVJNSVNTSU9OTEVTUzogUXVlcnkgdmVzdGVkIGFtb3VudCAocmVhZC1vbmx5KQAAAAANdmVzdGVkX2Ftb3VudAAAAAAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAAL",
        "AAAAAAAAADNQRVJNSVNTSU9OTEVTUzogUXVlcnkgdG90YWwgbnVtYmVyIG9mIHBsYW5zIGNyZWF0ZWQAAAAADmdldF9wbGFuX2NvdW50AAAAAAAAAAAAAQAAAAY=",
        "AAAAAAAAADNQRVJNSVNTSU9OTEVTUzogUXVlcnkgcmVsZWFzYWJsZSBhbW91bnQgKHJlYWQtb25seSkAAAAAEXJlbGVhc2FibGVfYW1vdW50AAAAAAAAAQAAAAAAAAAHcGxhbl9pZAAAAAAGAAAAAQAAAAs=",
        "AAAAAAAAAGFQRVJNSVNTSU9OTEVTUzogQW55b25lIGNhbiBjcmVhdGUgYSB2ZXN0aW5nIHBsYW4KUGxhbiBJRCBpcyBhdXRvLWdlbmVyYXRlZCBhcyBjb3VudGVyLWJhc2VkIGluZGV4AAAAAAAAE2NyZWF0ZV92ZXN0aW5nX3BsYW4AAAAABgAAAAAAAAALYmVuZWZpY2lhcnkAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAx0b3RhbF9hbW91bnQAAAALAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAAAAAAADmNsaWZmX2R1cmF0aW9uAAAAAAAGAAAAAQAAAAY=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_plan: this.txFromJSON<VestingPlan>,
        claim_vested: this.txFromJSON<i128>,
        vested_amount: this.txFromJSON<i128>,
        get_plan_count: this.txFromJSON<u64>,
        releasable_amount: this.txFromJSON<i128>,
        create_vesting_plan: this.txFromJSON<u64>
  }
}