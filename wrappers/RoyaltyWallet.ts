import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type RoyaltyWalletConfig = {};

export function royaltyWalletConfigToCell(config: RoyaltyWalletConfig): Cell {
    return beginCell().endCell();
}

export class RoyaltyWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new RoyaltyWallet(address);
    }

    static createFromConfig(config: RoyaltyWalletConfig, code: Cell, workchain = 0) {
        const data = royaltyWalletConfigToCell(config);
        const init = { code, data };
        return new RoyaltyWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
