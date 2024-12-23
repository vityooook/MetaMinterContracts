import { Address, beginCell, toNano } from '@ton/core';
import { PowerNftCollection } from '../wrappers/PowerNftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));

    const powerNftCollection = provider.open(PowerNftCollection.createFromAddress(address));

    await powerNftCollection.sendChangeComissionAndContent(provider.sender(), {
        commission: toNano("0"),
        contentCollection: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/collection.json",
        contentItemForCollection: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/"
    })
}