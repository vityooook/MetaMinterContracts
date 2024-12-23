import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano, TupleBuilder } from '@ton/core';
import { PowerNftCollection } from '../wrappers/PowerNftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('PowerNftCollection', () => {
    let powerNftCollectionCell: Cell;
    let nftItemCell: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let commissionWallet: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
    let referral: SandboxContract<TreasuryContract>;
    let powerNftCollection: SandboxContract<PowerNftCollection>;
    let buyNft: (index: number) => Promise<SandboxContract<NftItem>>;

    beforeAll(async () => {
        powerNftCollectionCell = await compile("PowerNftCollection");
        nftItemCell = await compile("NftItem");
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        owner = await blockchain.treasury('owner');
        admin = await blockchain.treasury('admin');
        buyer = await blockchain.treasury('buyer');
        commissionWallet = await blockchain.treasury('commissionWallet');
        referral = await blockchain.treasury('referral');

        powerNftCollection = blockchain.openContract(PowerNftCollection.createFromConfig({
            ownerAddress: owner.address,
            adminAddress: admin.address,
            commissionAddress: commissionWallet.address,
            available: -1,
            lastIndex: 0,
            price: toNano("0.2"),
            commission: toNano("0.1"),
            buyerLimit: 0,
            startTime: 0,
            endTime: 0,
            contentCollection: "https://storage.anon.tg/nft/anon_8club/collection.json",
            contentItemForCollection: "https://storage.anon.tg/nft/anon_8club/",
            nftItemCode: nftItemCell
        }, powerNftCollectionCell));

        buyNft = async (index: number) => blockchain.openContract(NftItem.createFromAddress((await powerNftCollection.getItemAddress(index)).nft_item_address));
    });

    it('should deploy collection contract', async () => {
        const deployResult = await powerNftCollection.sendDeploy(owner.getSender());

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            deploy: true,
            success: true,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: commissionWallet.address,
            success: true,
        });
    });

    it('should deploy collection contract with referral commission', async () => {
        const deployResult = await powerNftCollection.sendDeploy(owner.getSender(), {
            referralAddress: referral.address,
            referralCommission: toNano("0.2")
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: referral.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: commissionWallet.address,
            success: true
        });
    });

    it('should mint nft', async () => {
        const collectionData = await powerNftCollection.getAllInformation();
        const nftItem = await buyNft(collectionData.lastIndex);

        const deployResult = await powerNftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("0.4"),
            quantity: 1
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: commissionWallet.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: owner.address,
            success: true
        });
    });

    it('should mint multiple items', async () => {
        const infoBefore = await powerNftCollection.getAllInformation();
        const mintItems = 4;
        await powerNftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano(0.2 * mintItems),
            quantity: mintItems
        });
        const infoAfter = await powerNftCollection.getAllInformation();

        expect(infoBefore.lastIndex).toBeLessThan(infoAfter.lastIndex);
    });

    it('should change data', async () => {
        const infoBefore = await powerNftCollection.getAllInformation();

        const limitError = await powerNftCollection.sendChangeData(owner.getSender(), {
            price: toNano("0.2"),
            buyerLimit: 1,
            startTime: blockchain.now! + 100,
            endTime: blockchain.now! + 200,
            available: -1,
            ownerUser: owner.address
        });

        expect(limitError.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            exitCode: 709
        });

        const priceError = await powerNftCollection.sendChangeData(owner.getSender(), {
            price: toNano("0.1"),
            buyerLimit: 0,
            startTime: 0,
            endTime: 0,
            available: -1,
            ownerUser: owner.address
        });

        expect(priceError.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            exitCode: 710
        });

        const changeData = await powerNftCollection.sendChangeData(owner.getSender(), {
            price: toNano("2"),
            buyerLimit: 10,
            startTime: 0,
            endTime: 0,
            available: -1,
            ownerUser: owner.address
        });

        expect(changeData.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            success: true
        });

        const infoAfter = await powerNftCollection.getAllInformation();

        expect(infoBefore.price).toBeLessThan(infoAfter.price);
        expect(infoBefore.buyerLimit).toBeLessThan(infoAfter.buyerLimit);
    });

    
    it("shouldn't mint nft under specific conditions", async () => {
        const infoBefore = await powerNftCollection.getAllInformation();
        const nftItem = await buyNft(infoBefore.lastIndex);

        await powerNftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 1
        });

        blockchain.now = blockchain.now! + 150;

        await powerNftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("20"),
            quantity: 10
        });

        await powerNftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("1"),
            quantity: 1
        });

        blockchain.now = blockchain.now! + 300;

        await powerNftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 10
        });

        await powerNftCollection.sendChangeData(owner.getSender(), {
            price: toNano("2"),
            buyerLimit: 100,
            startTime: 0,
            endTime: 0,
            available: 0,
            ownerUser: owner.address
        });

        await powerNftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 1
        });

        const infoAfter = await powerNftCollection.getAllInformation();

        expect(infoBefore.lastIndex).toEqual(infoAfter.lastIndex);
    });

    it("should withdraw money by owner or admin only", async () => {
        const buyerWithdraw = await powerNftCollection.sendWithdrawMoney(buyer.getSender());
        const ownerWithdraw = await powerNftCollection.sendWithdrawMoney(owner.getSender());
        const adminWithdraw = await powerNftCollection.sendWithdrawMoney(admin.getSender());

        expect(buyerWithdraw.transactions).toHaveTransaction({
            from: buyer.address,
            to: powerNftCollection.address,
            success: false
        });

        expect(ownerWithdraw.transactions).toHaveTransaction({
            from: owner.address,
            to: powerNftCollection.address,
            success: true
        });

        expect(adminWithdraw.transactions).toHaveTransaction({
            from: admin.address,
            to: powerNftCollection.address,
            success: true
        });
    });

    it("should deploy nft through an additional function", async () => {
        const infoBefore = await powerNftCollection.getAllInformation();
        const nftItem = await buyNft(infoBefore.lastIndex);

        const fixNft = await powerNftCollection.sendFixNft(admin.getSender(), {
            index: infoBefore.lastIndex,
            nftOwner: buyer.address
        });

        expect(fixNft.transactions).toHaveTransaction({
            from: powerNftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        });
    });

    it("should change commission and metadata", async () => {
        const infoBefore = await powerNftCollection.getAllInformation();

        await powerNftCollection.sendChangeComissionAndContent(admin.getSender(), {
            commission: toNano("0.2"),
            contentCollection: "test",
            contentItemForCollection: "test"
        });

        const infoAfter = await powerNftCollection.getAllInformation();

        expect(infoBefore.commission).toBeLessThan(infoAfter.commission);
    });
});
