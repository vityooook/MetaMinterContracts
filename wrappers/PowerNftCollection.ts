import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano, TupleBuilder } from '@ton/core';
import { encodeOffChainContent } from "../wrappers/help/content";

export type PowerNftCollectionConfig = {
    ownerAddress: Address;
    adminAddress: Address;
    commissionAddress: Address;
    contentCollection: string;
    contentItemForCollection: string;
    nftItemCode: Cell;
    available: number;
    price: bigint;
    lastIndex: number;
    buyerLimit: number;
    startTime: number;
    endTime: number;
    commission: bigint;
};

export function buildPowerNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}

export function powerNftCollectionConfigToCell(config: PowerNftCollectionConfig): Cell {
    return beginCell()
        .storeInt(config.available, 2)
        .storeCoins(config.price)
        .storeUint(config.lastIndex, 32)
        .storeUint(config.buyerLimit, 32)
        .storeUint(config.startTime, 32)
        .storeUint(config.endTime, 32)
        .storeCoins(config.commission)
        .storeRef(buildPowerNftCollectionContentCell(config.contentCollection, config.contentItemForCollection))
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeAddress(config.ownerAddress)
                .storeAddress(config.adminAddress)
                .storeAddress(config.commissionAddress)
            .endCell()
        )
    .endCell();
}

export class PowerNftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new PowerNftCollection(address);
    }

    static createFromConfig(config: PowerNftCollectionConfig, code: Cell, workchain = 0) {
        const data = powerNftCollectionConfigToCell(config);
        const init = { code, data };
        return new PowerNftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, ref?: {
        referralAddress: Address;
        referralCommission: bigint; // если 0, то перевод всех денег рефералу.
    }) {
        let msg: Cell;
        if (ref) {
            msg = beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
                .storeAddress(ref.referralAddress)
                .storeCoins(ref.referralCommission)
            .endCell();
        } else {
            msg = beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
            .endCell();
        }
        await provider.internal(via, {
            value: toNano("0.3"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg
        });
    }

    async sendBuyNft(provider: ContractProvider, via: Sender, opts: {
        value: bigint;
        quantity: number;
    }) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeUint(opts.quantity, 32)
            .endCell(),
        });
    }

    async sendFixNft(provider: ContractProvider, via: Sender, opts: {
        index: number;
        nftOwner: Address;
    }) {
        await provider.internal(via, {
            value: toNano("0.05"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeUint(opts.index, 32)
                .storeAddress(opts.nftOwner)
            .endCell(),
        });
    }

    async sendChangeData(provider: ContractProvider, via: Sender, opts: {
        price: bigint;
        buyerLimit: number;
        startTime: number;
        endTime: number;
        available: number;
        ownerUser: Address;
    }) {
        await provider.internal(via, {
            value: toNano("0.02"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeCoins(opts.price)
                .storeUint(opts.buyerLimit, 32)
                .storeUint(opts.startTime, 32)
                .storeUint(opts.endTime, 32)
                .storeInt(opts.available, 2)
                .storeAddress(opts.ownerUser)
                .endCell(),
        });
    }

    async sendWithdrawMoney(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
            .endCell(),
        });
    }

    async sendChangeComissionAndContent(provider: ContractProvider, via: Sender, opts: {
        commission: bigint;
        contentCollection: string;
        contentItemForCollection: string;
    }) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32)
                .storeUint(0, 64)
                .storeCoins(opts.commission)
                .storeRef(buildPowerNftCollectionContentCell(opts.contentCollection, opts.contentItemForCollection))
            .endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get("get_collection_data", []);
        return {
            index: result.stack.readNumber(),
            content_collection: result.stack.readCell(),
            owner_user: result.stack.readAddress()
        };
    }

    async getItemAddress(provider: ContractProvider, nftIndex: number) {
        const tuple = new TupleBuilder();
        tuple.writeNumber(nftIndex);
        const result = await provider.get("get_nft_address_by_index", tuple.build());
        return {
            nft_item_address: result.stack.readAddress()
        };
    }

    async getAllInformation(provider: ContractProvider) {
        const result = await provider.get("get_all_information", []);
        return {
            ownerAddress: result.stack.readAddress(),
            adminAddress: result.stack.readAddress(),
            commissionAddress: result.stack.readAddress(),
            available: result.stack.readNumber(),
            price: result.stack.readNumber(),
            lastIndex: result.stack.readNumber(),
            buyerLimit: result.stack.readNumber(),
            startTime: result.stack.readNumber(),
            endTime: result.stack.readNumber(),
            commission: result.stack.readNumber(),
            contentCollection: result.stack.readCell(),
            contentItem: result.stack.readCell()
        };
    }
}
