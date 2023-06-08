import {Context, Input, Markup, Telegraf} from 'telegraf';

import {Update} from 'typegram';
import {config} from "dotenv";

config()

import {Api} from './api'
// import {Api} from './dummy_api'
import {downloadImage} from "./utils";
import {MJMessage} from "midjourney";
import * as fs from "fs";

import {storage} from "./storage";
import {InlineKeyboardMarkup} from "telegraf/src/core/types/typegram";


const bot: Telegraf<Context<Update>> = new Telegraf(process.env.BOT_TOKEN as string);

bot.start(async (ctx) => {
    try {
        await processMessage(ctx, 'Welcome ' + ctx.from.first_name)
        if (!(await storage.knownPersonsHas(ctx.from.id))) {
            await processMessage(ctx, "You are NOT in the list of known persons, you can't use this bot, sorry")
            return
        }
    } catch (e) {
        console.log(e)
    }
});


const getApi = () => {
    return new Api()
}

const processMessage = async (ctx: Context<Update>, msg: string) => {
    console.log('sending message:', msg)
    try {
        await ctx.replyWithHTML(msg)
    } catch (e) {
        console.log("Can't send message", e)
    }
}

const createMarkupTable = (msgId: string): Markup.Markup<InlineKeyboardMarkup> => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("U1", `${msgId}:U1`),
            Markup.button.callback("U2", `${msgId}:U2`),
            Markup.button.callback("U3", `${msgId}:U3`),
            Markup.button.callback("U4", `${msgId}:U4`),
        ], [
            Markup.button.callback("V1", `${msgId}:V1`),
            Markup.button.callback("V2", `${msgId}:V2`),
            Markup.button.callback("V3", `${msgId}:V3`),
            Markup.button.callback("V4", `${msgId}:V4`),

        ]
    ])
}

const sendImageWithButtons = async (ctx: Context<Update>, msg: MJMessage, caption?: string) => {
    storage.cacheMessage(msg)

    const file = await downloadImage(msg.uri)
    console.log('sending photo with caption:', caption)
    console.log(msg.uri)
    try {
        await ctx.replyWithPhoto(Input.fromLocalFile(file), {
            ...createMarkupTable(msg.id!),

        })
    } catch (e) {
        console.log("Can't send image", e)
        await ctx.replyWithHTML('Can\'t upload image, sorry, here is the link:' + msg.uri, {
            ...createMarkupTable(msg.id!),
        })

    }

    fs.unlinkSync(file)
}

bot.command('auth', async (ctx) => {
    const password = ctx.update.message?.text.slice(6)
    if (password !== process.env.AUTH_PASSWORD) {
        return
    }
    await storage.addKnownPerson(ctx.from.id)
    await processMessage(ctx, 'You can use /imagine now')
})

bot.command('ping', async (ctx) => {
    await processMessage(ctx, 'pong')
})

bot.command('imagine', async (ctx) => {

    if (!(await storage.knownPersonsHas(ctx.from.id))) {
        await processMessage(ctx, "You are NOT in the list of known persons, you can't use this bot, sorry")
        return
    }

    let prompt = ctx.update.message?.text.slice(9)
    if (!prompt) {
        await processMessage(ctx, 'You should provide prompt, like\ncode>/imagine cat flying in the clouds in the style of Edward Tufte</code>')
        return
    }

    prompt = prompt.replace('—', '--')

    console.log('PROMPT:', prompt)
    await processMessage(ctx, `I'm starting to come up with: <b>${prompt}</b>\nWait a bit, it may take some time`)
    try {
        const apiResponse = await getApi().imagine(prompt)
        if (!apiResponse) {
            console.log('Api response in null');
            await processMessage(ctx, `Something went wrong (`)
            return;
        }
        if (apiResponse.progress !== 'done') {
            await processMessage(ctx, `Something went wrong (`)
            return
        }
        await sendImageWithButtons(ctx, apiResponse, prompt)
    } catch (e) {
        await processMessage(ctx, `Something went wrong (`)
        console.log(e)
        return
    }
});


bot.on('callback_query', async (ctx) => {
    try {
        const data = (ctx.callbackQuery as any)['data']
        const [id, cmd] = data.split(':')

        const msg = await storage.getCachedMessage(id)
        if (!msg) {
            await processMessage(ctx, 'There was a problem with cache, try to request image again')
            return
        }

        const [t, num] = cmd.split('')

        if (t === 'U') {
            await processMessage(ctx, 'Upscale version ' + num + '\nWait a bit, it may take some time')
            const upscaleMsg = await getApi().upscale(msg, num)
            if (!upscaleMsg) {
                console.log('UPSCALE: Api response in null')
                await processMessage(ctx, 'Something went wrong')
                return
            }
            const file = await downloadImage(upscaleMsg.uri)
            await ctx.replyWithDocument(Input.fromLocalFile(file))
            fs.unlinkSync(file)
        } else if (t === 'V') {
            await processMessage(ctx, 'New variations for version ' + num + '\nWait a bit, it may take some time')
            const variantMsg = await getApi().variant(msg, num)
            if (!variantMsg) {
                console.log('VARIATIONS: Api response in null')
                await processMessage(ctx, 'Something went wrong')
                return
            }
            await sendImageWithButtons(ctx, variantMsg)
        } else {
            await processMessage(ctx, 'Unknown command')
        }
    } catch (e) {
        console.log(e)
        await processMessage(ctx, 'Something went wrong')
    }

});

const run = () => {
    console.log(new Date(), 'Started')
    bot.launch();

}


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'))

while (true) {
    try {
        run()

    } catch (e) {
        console.log(e)
        console.log('Restarting...')
    }
}
