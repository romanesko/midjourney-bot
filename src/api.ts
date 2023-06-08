import {Midjourney, MJMessage} from "midjourney";

export interface ApiMessage {
    id: string
    hash: string
    progress: string
    uri: string
    content: string


}

export class Api {

    constructor() {
        for (const key of ['MJ_SERVER_ID', 'MJ_CHANNEL_ID', 'MJ_TOKEN']) {
            if (process.env[key] == undefined) throw new Error(`${key} is undefined`)
        }
    }

    private async getClient() {
        const client = new Midjourney({
            ServerId: process.env.MJ_SERVER_ID,
            ChannelId: process.env.MJ_CHANNEL_ID,
            SalaiToken: <string>process.env.MJ_TOKEN,
            Debug: true,
            Ws: true,
        });
        await client.init();
        return client;
    }

    public async imagine(prompt: string): Promise<MJMessage | null> {
        const client = await this.getClient()
        return client.Imagine(prompt)
    }

    public async upscale(msg: MJMessage, num: number): Promise<MJMessage | null> {
        const client = await this.getClient()
        return client.Upscale(
            msg.content,
            num,
            <string>msg.id,
            <string>msg.hash,
            (uri, progress) => {
                console.log("loading", uri, "progress", progress);
            }
        );

    }

    async variant(msg: MJMessage, num: number): Promise<MJMessage | null> {
        const client = await this.getClient()
        return client.Variation(
            msg.content,
            num,
            <string>msg.id,
            <string>msg.hash,
            (uri: string) => {
                console.log("loading", uri);
            }
        );
    }
}


