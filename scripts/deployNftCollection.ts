import { toNano, Address } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        owner_user: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"),
        admin: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"),
        available: -1,
        last_index: 0,
        price: toNano("0.2"),
        comission: toNano("0.1"),
        buyer_limit: 1000,
        start_time: 0,
        end_time: 0,
        content_collection: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/collection.json",
        content_item_for_collection: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/",
        content_item_for_item: "0.json",
        nft_item_code: await compile("NftItem")
    }, await compile('NftCollection')));

    await nftCollection.sendDeploy(provider.sender());

    await provider.waitForDeploy(nftCollection.address);

    // run methods on `nftCollection`
}
