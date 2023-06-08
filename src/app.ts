import {Context, Input, Markup, Telegraf} from 'telegraf';
import {Update} from 'typegram';
import {config} from "dotenv";

config()

// import {Api} from './api'
import {Api} from './dummy_api'
import {downloadImage} from "./utils";
import {MJMessage} from "midjourney";
import * as fs from "fs";

import {storage} from "./storage";


const bot: Telegraf<Context<Update>> = new Telegraf(process.env.BOT_TOKEN as string);

bot.start((ctx) => ctx.reply('Welcome' + ctx.from.first_name));


const getApi = () => {
    return new Api()
}

const sendImageWithButtons = async (ctx: Context<Update>, msg: MJMessage, caption?: string) => {
    storage.cacheMessage(msg)

    const file = await downloadImage(msg.uri)
    await ctx.replyWithPhoto(Input.fromLocalFile(file), {
        caption,
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback("U1", `${msg.id}:U1`),
                Markup.button.callback("U2", `${msg.id}:U2`),
                Markup.button.callback("U3", `${msg.id}:U3`),
                Markup.button.callback("U4", `${msg.id}:U4`),
            ], [
                Markup.button.callback("V1", `${msg.id}:V1`),
                Markup.button.callback("V2", `${msg.id}:V2`),
                Markup.button.callback("V3", `${msg.id}:V3`),
                Markup.button.callback("V4", `${msg.id}:V4`),

            ]
        ])

    })

    fs.unlinkSync(file)
}

bot.command('auth', async (ctx) => {
    const password = ctx.update.message?.text.slice(6)
    if (password !== process.env.AUTH_PASSWORD) {
        return
    }
    await storage.addKnownPerson(ctx.from.id)
    ctx.reply('You can use /imagine now')
})


bot.command('imagine', async (ctx) => {

    if (!(await storage.knownPersonsHas(ctx.from.id))) {
        ctx.reply('You are NOT in the list of known persons, you can use this bot, sotty')
        return
    }

    const prompt = ctx.update.message?.text.slice(9)
    if (!prompt) {
        ctx.reply('You should provide prompt, like /imagine cat')
        return
    }
    console.log('PROMPT:', prompt)
    ctx.reply(`I'm starting to come up with: *${prompt}*\nWait a bit, it may take some time`, {parse_mode: 'MarkdownV2'})
    try {
        const apiResponse = await getApi().imagine(prompt)
        if (!apiResponse) {
            console.log('Api response in null');
            ctx.reply(`Something went wrong (`)
            return;
        }
        if (apiResponse.progress !== 'done') {
            ctx.reply(`Something went wrong (`)
            return
        }
        await sendImageWithButtons(ctx, apiResponse, prompt)
    } catch (e) {
        ctx.reply(`Something went wrong (`)
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
            ctx.reply('There was a problem with cache, try to request image again')
            return
        }

        const [t, num] = cmd.split('')

        if (t === 'U') {
            ctx.reply('Upscale version ' + num + '\nWait a bit, it may take some time')
            const upscaleMsg = await getApi().upscale(msg, num)
            if (!upscaleMsg) {
                console.log('UPSCALE: Api response in null')
                ctx.reply('Something went wrong')
                return
            }
            const file = await downloadImage(upscaleMsg.uri)
            await ctx.replyWithDocument(Input.fromLocalFile(file))
            fs.unlinkSync(file)
        } else if (t === 'V') {
            ctx.reply('New variations for version ' + num + '\nWait a bit, it may take some time')
            const variantMsg = await getApi().variant(msg, num)
            if (!variantMsg) {
                console.log('VARIATIONS: Api response in null')
                ctx.reply('Something went wrong')
                return
            }
            await sendImageWithButtons(ctx, variantMsg)
        } else {
            ctx.reply('Unknown command')
        }
    } catch (e) {
        console.log(e)
        ctx.reply('Something went wrong')
    }

});
bot.launch();


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'))
