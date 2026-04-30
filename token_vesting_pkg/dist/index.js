import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAQAAAAAAAAAAAAAAC1Zlc3RpbmdQbGFuAAAAAAgAAAAAAAAAC2JlbmVmaWNpYXJ5AAAAABMAAAAAAAAADmNsaWZmX2R1cmF0aW9uAAAAAAAGAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAAAAAAAD3JlbGVhc2VkX2Ftb3VudAAAAAALAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAADHRvdGFsX2Ftb3VudAAAAAs=",
            "AAAAAAAAACpQRVJNSVNTSU9OTEVTUzogUXVlcnkgdmVzdGluZyBwbGFuIGRldGFpbHMAAAAAAAhnZXRfcGxhbgAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAfQAAAAC1Zlc3RpbmdQbGFuAA==",
            "AAAAAAAAADRQRVJNSVNTSU9OTEVTUzogQW55b25lIGNhbiBjbGFpbSB0aGVpciB2ZXN0ZWQgdG9rZW5zAAAADGNsYWltX3Zlc3RlZAAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAAL",
            "AAAAAAAAAC9QRVJNSVNTSU9OTEVTUzogUXVlcnkgdmVzdGVkIGFtb3VudCAocmVhZC1vbmx5KQAAAAANdmVzdGVkX2Ftb3VudAAAAAAAAAEAAAAAAAAAB3BsYW5faWQAAAAABgAAAAEAAAAL",
            "AAAAAAAAADNQRVJNSVNTSU9OTEVTUzogUXVlcnkgdG90YWwgbnVtYmVyIG9mIHBsYW5zIGNyZWF0ZWQAAAAADmdldF9wbGFuX2NvdW50AAAAAAAAAAAAAQAAAAY=",
            "AAAAAAAAADNQRVJNSVNTSU9OTEVTUzogUXVlcnkgcmVsZWFzYWJsZSBhbW91bnQgKHJlYWQtb25seSkAAAAAEXJlbGVhc2FibGVfYW1vdW50AAAAAAAAAQAAAAAAAAAHcGxhbl9pZAAAAAAGAAAAAQAAAAs=",
            "AAAAAAAAAGFQRVJNSVNTSU9OTEVTUzogQW55b25lIGNhbiBjcmVhdGUgYSB2ZXN0aW5nIHBsYW4KUGxhbiBJRCBpcyBhdXRvLWdlbmVyYXRlZCBhcyBjb3VudGVyLWJhc2VkIGluZGV4AAAAAAAAE2NyZWF0ZV92ZXN0aW5nX3BsYW4AAAAABgAAAAAAAAALYmVuZWZpY2lhcnkAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAx0b3RhbF9hbW91bnQAAAALAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAAAAAAADmNsaWZmX2R1cmF0aW9uAAAAAAAGAAAAAQAAAAY="]), options);
        this.options = options;
    }
    fromJSON = {
        get_plan: (this.txFromJSON),
        claim_vested: (this.txFromJSON),
        vested_amount: (this.txFromJSON),
        get_plan_count: (this.txFromJSON),
        releasable_amount: (this.txFromJSON),
        create_vesting_plan: (this.txFromJSON)
    };
}
