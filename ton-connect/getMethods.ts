import { TonClient, Address, Cell,  } from "@ton/ton";
import { decodeOffChainContent, decodeContentItem } from "./content";

const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "b2f5b5d58f553b4f9f29e6a3ae7def64682b1c6c8ef2a6eb0858538027c67122" // you can get an api key from @tonapibot bot in Telegram
});

async function getAllData(address: Address) {
    const response = await client.runMethod(address, "get_all_information", []);

    const owner_user = response.stack.readAddress();
    const admin = response.stack.readAddress();
    const available = response.stack.readBoolean();
    const price = response.stack.readBigNumber();
    const last_index = response.stack.readNumber();
    const buyer_limit = response.stack.readNumber();
    const start_time = response.stack.readNumber();
    const end_time = response.stack.readNumber();
    const comission = response.stack.readBigNumber();
    const content_collection = decodeOffChainContent(response.stack.readCell());
    const content_item = decodeContentItem(response.stack.readCell());
}

getAllData(Address.parse("kQAr3CQsxtYUm_vWXCyHzbRxe7wqSppYJJSqJifA_6lFgXCD"))
