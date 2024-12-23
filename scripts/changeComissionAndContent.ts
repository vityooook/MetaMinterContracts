import { Address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    await nftCollection.sendChangeComissionAndContent(provider.sender(), {
        comission: toNano(""),
        content_collection: "",
        content_item_for_collection: "",
        content_item_for_item: ""
    })
}