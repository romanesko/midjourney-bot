import {createClient, RedisClientType} from "redis";
import {MJMessage} from "midjourney";

class Storage {
    private client: RedisClientType;

    constructor() {

        for (const key of ['REDIS_HOST', 'REDIS_HOST', 'REDIS_PORT']) {
            if (process.env[key] == undefined) throw new Error(`${key} is undefined`)
        }

        this.client = createClient({
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: <number>(process.env.REDIS_PORT || 6379)
            }
        });
    }

    private async getClient(): Promise<RedisClientType> {
        if (!this.client.isOpen) await this.client.connect()
        return this.client
    }

    private async get<T>(key: string): Promise<T | null> {

        const val = await this.client.get(key)
        if (val == null) return null;
        return JSON.parse(val)
    }

    private async set(key: string, value: Record<string, any>): Promise<void> {
        if (!this.client.isOpen) await this.client.connect()
        if (value instanceof Set) {
            value = Array.from(value)
        }
        await this.client.set(key, JSON.stringify(value))
    }


    public addKnownPerson = async (id: number): Promise<void> => {
        const client = await this.getClient()
        await client.sAdd('MJ_KNOWN_PERSONS', String(id))
    }

    async knownPersonsHas(id: number): Promise<boolean> {
        const client = await this.getClient()
        return client.sIsMember('MJ_KNOWN_PERSONS', String(id))
    }

    async cacheMessage(msg: MJMessage) {
        const client = await this.getClient()
        const key = 'MG_MESSAGES::' + msg.id
        const val = JSON.stringify(msg)
        await client.set(key, val, {EX: 60 * 60 * 24})
    }

    async getCachedMessage(msgId: string) {
        const client = await this.getClient()
        const res = await client.get('MG_MESSAGES::' + msgId)
        if (res == null) {
            return null
        }
        return JSON.parse(res)
    }

}

export const storage = new Storage()

