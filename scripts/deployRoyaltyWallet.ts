import { toNano } from '@ton/core';
import { RoyaltyWallet } from '../wrappers/RoyaltyWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const royaltyWallet = provider.open(RoyaltyWallet.createFromConfig({}, await compile('RoyaltyWallet')));

    await royaltyWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(royaltyWallet.address);

    // run methods on `royaltyWallet`
}
