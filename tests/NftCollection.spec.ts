import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano, TupleBuilder } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('NftCollection', () => {
    let nftCollectionCell: Cell;
    let nftItemCell: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
    let referral: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let buyNft: (index: number) => Promise<SandboxContract<NftItem>>;

    beforeAll(async () => {
        nftCollectionCell = await compile("NftCollection");
        nftItemCell = await compile("NftItem");
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        owner = await blockchain.treasury('owner');
        admin = await blockchain.treasury('admin');
        buyer = await blockchain.treasury('buyer');
        referral = await blockchain.treasury('referral');

        nftCollection = blockchain.openContract(NftCollection.createFromConfig({
            ownerAddress: owner.address,
            adminAddress: admin.address,
            available: -1,
            lastIndex: 0,
            price: toNano("0.2"),
            commission: toNano("0.1"),
            buyerLimit: 0,
            startTime: 0,
            endTime: 0,
            contentCollection: "https://storage.anon.tg/nft/anon_8club/collection.json",
            contentItemForCollection: "https://storage.anon.tg/nft/anon_8club/",
            contentItemForItem: "nft.json",
            nftItemCode: nftItemCell
        }, nftCollectionCell));

        buyNft = async (index: number) => blockchain.openContract(NftItem.createFromAddress((await nftCollection.getItemAddress(index)).nftItemAddress));
    });

    it('should deploy collection contract', async () => {
        const deployResult = await nftCollection.sendDeploy(owner.getSender());

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: admin.address,
            success: true,
        });
    });

    it('should deploy collection contract with referral commission', async () => {
        const deployResult = await nftCollection.sendDeploy(owner.getSender(), {
            referralAddress: referral.address,
            referralCommission: toNano("0.2")
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: referral.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: admin.address,
            success: true
        });
    });

    it('should mint nft', async () => {
        const collectionData = await nftCollection.getAllInformation();
        const nftItem = await buyNft(collectionData.lastIndex);

        const deployResult = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("0.4"),
            quantity: 1
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: admin.address,
            success: true
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: owner.address,
            success: true
        });
    });

    it('should mint multiple items', async () => {
        const infoBefore = await nftCollection.getAllInformation();
        const mintItems = 4;
        await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano(0.2 * mintItems),
            quantity: mintItems
        });
        const infoAfter = await nftCollection.getAllInformation();

        expect(infoBefore.lastIndex).toBeLessThan(infoAfter.lastIndex);
    });

    it('should change data', async () => {
        const infoBefore = await nftCollection.getAllInformation();

        const limitError = await nftCollection.sendChangeData(owner.getSender(), {
            price: toNano("0.2"),
            buyerLimit: 1,
            startTime: blockchain.now! + 100,
            endTime: blockchain.now! + 200,
            available: -1,
            ownerUser: owner.address
        });

        expect(limitError.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            exitCode: 709
        });

        const priceError = await nftCollection.sendChangeData(owner.getSender(), {
            price: toNano("0.1"),
            buyerLimit: 0,
            startTime: 0,
            endTime: 0,
            available: -1,
            ownerUser: owner.address
        });

        expect(priceError.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            exitCode: 710
        });

        const changeData = await nftCollection.sendChangeData(owner.getSender(), {
            price: toNano("2"),
            buyerLimit: 10,
            startTime: 0,
            endTime: 0,
            available: -1,
            ownerUser: owner.address
        });

        expect(changeData.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true
        });

        const infoAfter = await nftCollection.getAllInformation();

        expect(infoBefore.price).toBeLessThan(infoAfter.price);
        expect(infoBefore.buyerLimit).toBeLessThan(infoAfter.buyerLimit);
    });

    it("should mint some nfts", async () => {
        const infoBefore = await nftCollection.getAllInformation();

        await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("20"),
            quantity: 10
        });

        const infoAfter = await nftCollection.getAllInformation();

        expect(infoBefore.lastIndex).toBeLessThan(infoAfter.lastIndex);

        await nftCollection.sendChangeData(owner.getSender(), {
            price: toNano("2"),
            buyerLimit: 10,
            startTime: blockchain.now! + 100,
            endTime: blockchain.now! + 200,
            available: -1,
            ownerUser: owner.address
        });
    });

    it("shouldn't mint nft under specific conditions", async () => {
        const infoBefore = await nftCollection.getAllInformation();
        const nftItem = await buyNft(infoBefore.lastIndex);

        await nftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 1
        });

        blockchain.now = blockchain.now! + 150;

        await nftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("20"),
            quantity: 10
        });

        await nftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("1"),
            quantity: 1
        });

        blockchain.now = blockchain.now! + 300;

        await nftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 10
        });

        await nftCollection.sendChangeData(owner.getSender(), {
            price: toNano("2"),
            buyerLimit: 100,
            startTime: 0,
            endTime: 0,
            available: 0,
            ownerUser: owner.address
        });

        await nftCollection.sendBuyNft(buyer.getSender(), { 
            value: toNano("2"),
            quantity: 1
        });

        const infoAfter = await nftCollection.getAllInformation();

        expect(infoBefore.lastIndex).toEqual(infoAfter.lastIndex);
    });

    it("should withdraw money by owner or admin only", async () => {
        const buyerWithdraw = await nftCollection.sendWithdrawMoney(buyer.getSender());
        const ownerWithdraw = await nftCollection.sendWithdrawMoney(owner.getSender());
        const adminWithdraw = await nftCollection.sendWithdrawMoney(admin.getSender());

        expect(buyerWithdraw.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            success: false
        });

        expect(ownerWithdraw.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true
        });

        expect(adminWithdraw.transactions).toHaveTransaction({
            from: admin.address,
            to: nftCollection.address,
            success: true
        });
    });

    it("should deploy nft through an additional function", async () => {
        const infoBefore = await nftCollection.getAllInformation();
        const nftItem = await buyNft(infoBefore.lastIndex);

        const fixNft = await nftCollection.sendFixNft(admin.getSender(), {
            index: infoBefore.lastIndex,
            nftOwner: buyer.address
        });

        expect(fixNft.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        });
    });

    it("should change commission and metadata", async () => {
        const infoBefore = await nftCollection.getAllInformation();

        await nftCollection.sendChangeCommissionAndContent(admin.getSender(), {
            commission: toNano("0.2"),
            contentCollection: "test",
            contentItemForCollection: "test",
            contentItemForItem: "test"
        });

        const infoAfter = await nftCollection.getAllInformation();

        expect(infoBefore.commission).toBeLessThan(infoAfter.commission);
    });
});
