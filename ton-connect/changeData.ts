import { beginCell, Address } from "@ton/ton";

async function changeData(args: {
    price: bigint;
    buyerLimit: number;
    startTime: number;
    endTime: number;
    available: number;
    ownerAddress: Address;
}) {
    const body = beginCell()
        .storeCoins(args.price)
        .storeUint(args.buyerLimit, 32)
        .storeUint(args.startTime, 32)
        .storeUint(args.endTime, 32)
        .storeInt(args.available, 2)
        .storeAddress(args.ownerAddress)
    .endCell().toBoc().toString("base64");

    return {body};
}