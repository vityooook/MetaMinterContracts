import { beginCell, Cell, Address, toNano, contractAddress } from "@ton/ton";
import { encodeOffChainContent } from "./content";

// Function to build NFT collection content cell
function buildNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
  const encodedCollectionContent = encodeOffChainContent(collectionContent);

  const commonContentCell = beginCell();
  commonContentCell.storeBuffer(Buffer.from(commonContent));

  const contentCell = beginCell()
    .storeRef(encodedCollectionContent)
    .storeRef(commonContentCell.endCell());

  return contentCell.endCell();
}

// Main function to mint NFT collection
async function main(args: {
    nftCollectionCodeHex: string;
    nftItemCodeHex: string;
    admin: Address;
    userOwner: Address;
    price: bigint; // Minimum price is 0.2 TON
    buyerLimit: number; // Limit on minting NFTs, if no limit then set to 0
    startTime: number; // Mint start time, 0 if no start time
    endTime: number; // Mint end time, 0 if no end time
    collectionContent: string; // Collection content
    itemContent: string; // Base path for item content
    itemContentJson: string; // e.g. "nft.json"
    commission: bigint; // Commission fee]
    ref?: {
        referralAddress: Address;
        referralComission: bigint; // if comission = 0 referral get all ton from transaction 
    }
}) {
  // Convert hex strings to Cell objects
    const nftCollectionCodeCell = Cell.fromBoc(Buffer.from(args.nftCollectionCodeHex, 'hex'))[0];
    const nftItemCodeCell = Cell.fromBoc(Buffer.from(args.nftItemCodeHex, 'hex'))[0];

    // Build the NFT collection data
    const NftCollectionData = beginCell()
        .storeAddress(args.userOwner)
        .storeAddress(args.admin)
        .storeRef(
        beginCell()
            .storeRef(buildNftCollectionContentCell(args.collectionContent, args.itemContent))
            .storeRef(beginCell().storeBuffer(Buffer.from(args.itemContentJson)).endCell())
            .storeRef(nftItemCodeCell)
            .endCell()
        )
        .storeInt(-1, 8)
        .storeCoins(args.price)
        .storeUint(0, 32) 
        .storeUint(args.buyerLimit, 32)
        .storeUint(args.startTime, 32)
        .storeUint(args.endTime, 32)
        .storeCoins(args.commission)
        .endCell();

    // Create state initialization
    const stateInit = beginCell()
        .storeUint(0, 2) 
        .storeUint(1, 1) 
        .storeUint(1, 1) 
        .storeUint(0, 1) 
        .storeRef(nftCollectionCodeCell)
        .storeRef(NftCollectionData)
        .endCell();

    // Compute contract address
    const address = contractAddress(0, { code: nftCollectionCodeCell, data: NftCollectionData });

    // Convert state init cell to base64
    const stateInitBase64 = Buffer.from(stateInit.toBoc()).toString("base64");
    if (args.ref) {
        var msgBody = beginCell()
            .storeUint(4, 32)
            .storeUint(0, 64)
            .storeAddress(args.ref.referralAddress)
            .storeCoins(args.ref.referralComission)
        .endCell().toBoc().toString("base64");
    } else {
        var msgBody = beginCell()
            .storeUint(4, 32)
            .storeUint(0, 64)
        .endCell().toBoc().toString("base64");
    }

    return { address, stateInitBase64, msgBody };
}

const t = main({
    nftCollectionCodeHex: "b5ee9c72410220010005d2000114ff00f4a413f4bcf2c80b0102016202190202cd0312020120041104f543322c700925f03e0d0d3030171b0925f03e0fa403002d31fd33f31ed44d0fa4001f861fa4001f862d20101f863fa0001f864d31f01f865d31f01f866d31f01f867d31f01f868fa0001f869d401f86ad401f86bd430f86c21c001e30232f8415230c705f8425240c705b1f2e04520c002e30220c003e30220c0048050c0d0e01fc31d31f30f8445210a85220b98e255b70c8cb1f8d05539bdd08195b9bdd59da08199d5b991cc83c27e4ac20cf1670018040f007e0f8438e345b70c8cb1f8d0914d85b19481a5cc81d195b5c1bdc985c9a5b1e481d5b985d985a5b18589b19483c27e6aae0cf1670018040f007e1f823f847bef823f848bbb0f847f848bab10603f8f823f847bef848c000b0b1f847c000f823f848bbb0b18e355b70c8cb1f8d09539195081a5cc81b9bdd08185d985a5b18589b1948185d081d1a1a5cc81d1a5b594838a3ece0cf1670018040f007e1f8455210a0f846b9f846c000b1e30331209af84522f006f845a4f865e4f842f84958a86d71f00770c8cb1f89cf16070a0b017630f846f845a1c200e3023070c8cb1f8d08505b1b081391951cc8185c9948185b1c9958591e481cdbdb19081bdd5d0838a6e520cf1670018040f0070801fcf846f845a170c8cb1f8d04965bdd4818d85b881bdb9b1e481b5a5b9d0820cf162170019c7aa90ca6304313a45110c000e63092cb07e48bb204e465420e29aa1efb88f8cf16f8445220a813a18209312d00a154431370f007209af84522f006f845a4f865e431f842f84958a86d71f007820afaf08070fb02f841706d8306090008f007f00300444e46542070757263686173652077696c6c2062652061207375636365737320e29c85003682080f42400171f007820afaf08070fb02f841706d8306f007f003005030f84212c705f2e2c3d31ffa4030f8455220bbf2e2c4f84512baf84558f00697f845a4f865f003de00763031fa0001f864d31f01f866d31f01f867d31f01f868d20101f863fa4030f861f846f845bcf846c000b1f2e2c5f84482100bebc200b9f2d2c6f00302f08e67303120d74981010bbc8e4afa40fa003070c8cb1f8d06149959995c9c985b0818dbdb5b5a5cdcda5bdb883c27e6aa20cf1621c0009c82084c4b4070fb028306f007e071f00782084c4b4070fb02f842706d8306f007e03082084c4b4070fb02f842706d8306f007e020c005e302c008e3025b840ff2f00f10003030f84212c705f2e2c3fa0001f869d401f86ad430f86bf0030020f84212c705f2e2c3d4d43001ed54fb0400635f84cf84bf84af848f847f846f845f843c8f841cf16f842cf16ca01f844fa02cb1fcb1fcb1fcb1ff849fa02ccccccc9ed54802012013160201201415002f3232cffe0a33c5b25c3e13087232c07d0004bd0032c03260001b3e401d3232c084b281f2fff2742002012017180057007c011c087c017e12f2140133c584f3325de0063232c1540133c5a0827270e03e8084f2daf333325c7ec02000431c20063232c1540173c59400fe8084f2da889bace51633c5c0644cb88072407ec0200201201a1f0201201b1e0201201c1d00a1b56ba63da89a1f48003f0c3f48003f0c5a40203f0c7f40003f0c9a63e03f0cba63e03f0cda63e03f0cfa63e03f0d1f40003f0d3a803f0d5a803f0d7a861f0d9f095a1a863a861a0e391960e039e2d9993000d1b5cb3da89a1f48003f0c3f48003f0c5a40203f0c7f40003f0c9a63e03f0cba63e03f0cda63e03f0cfa63e03f0d1f40003f0d3a803f0d5a803f0d7a861f0d9f095a1f083f085f087f089f08bf08df08ff091f09213a861f0962134211220f020ce20ac208a2068204700089ba7a3ed44d0fa4001f861fa4001f862d20101f863fa0001f864d31f01f865d31f01f866d31f01f867d31f01f868fa0001f869d401f86ad401f86bd430f86cf0047001f00580091bc82df6a2687d2000fc30fd2000fc31690080fc31fd0000fc32698f80fc32e98f80fc33698f80fc33e98f80fc347d0000fc34ea00fc356a00fc35ea187c367c25687c2280ea187c20c73a4f8bb",
    nftItemCodeHex: "b5ee9c7241020d010001d6000114ff00f4a413f4bcf2c80b01020162020c0202ce0309020120040802e30c8871c02497c0f83434c0c05c6c2497c0f83e903e900c7e800c5c75c87e800c7e800c1cea6d003c00812ce3850c1b088d148cb1c17cb865407e90350c0408fc00f801b4c7f4cfe08417f30f45148c2ea3a24c840dd78c9004f6cf380c0d0d0d4d60840bf2c9a884aeb8c097c12103fcbc20050701f65135c705f2e191fa4021f001fa40d20031fa00820afaf0801ba121945315a0a1de22d70b01c300209206a19136e220c2fff2e192218e3e821005138d91c85009cf16500bcf16712449145446a0708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb00104794102a375be2060082028e3526f0018210d53276db103744006d71708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0093303234e25502f00300727082108b77173505c8cbff5004cf1610248040708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0000113e910c1c2ebcb853600201200a0b003b3b513434cffe900835d27080269fc07e90350c04090408f80c1c165b5b60001d00f232cfd633c58073c5b3327b55200009a11f9fe005042c0d2f",
    admin: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"),
    userOwner: Address.parse("UQAj7iNlsYm1GskJZV4iGWdeJKp3COxyG0x4kLB-IKGBmy2w"), // будующий владелец (создатель)
    price: toNano("0.2"), // цена nft. минимальная цена 0.2 ton
    buyerLimit: 1000,  // количество nft на минт. если ограничения нету, то 0
    startTime: 0, // время начала минт. если начала минта нету, то 0
    endTime: 0, // время окончания минт. если окончания минта нету, то 0
    collectionContent: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/collection.json", // контент для колекции 
    itemContent: "https://cobuild.ams3.digitaloceanspaces.com/community/ton/nft/data/", // контент для item без полного пути
    itemContentJson: "0.json", // "nft.json"
    commission: toNano("0.1"), // наша комиссия 
});
console.log(t)