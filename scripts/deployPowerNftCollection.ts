import { Address, toNano } from '@ton/core';
import { PowerNftCollection } from '../wrappers/PowerNftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const powerNftCollection = provider.open(PowerNftCollection.createFromConfig({
        ownerAddress: Address.parse("UQDBCzvugfUs3v9z_YUSix5XQimd4hNA7BTBCqyikQW2BylZ"),
        adminAddress: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"),
        commissionAddress: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"),
        available: -1,
        lastIndex: 0,
        price: toNano("2"),
        commission: toNano("0.1"),
        buyerLimit: 100,
        startTime: 0,
        endTime: 0,
        contentCollection: "https://raw.githubusercontent.com/vityooook/BearMetaData/refs/heads/main/collection.json",
        contentItemForCollection: "https://raw.githubusercontent.com/vityooook/BearMetaData/refs/heads/main/NftMetadata/",
        nftItemCode: await compile("NftItem")
    }, await compile('PowerNftCollection')));

    await powerNftCollection.sendDeploy(provider.sender());

    await provider.waitForDeploy(powerNftCollection.address);
    // https://raw.githubusercontent.com/vityooook/BearMetaData/refs/heads/main/collection.json
    // https://raw.githubusercontent.com/vityooook/BearMetaData/refs/heads/main/NftMetadata/
}
