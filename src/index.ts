import { Client, Intents, MessageEmbed } from 'discord.js';
import puppeteer from 'puppeteer';

import config from './config.json';

const DISCORD_CLIENT = new Client({ ws: { intents: Intents.ALL } });

DISCORD_CLIENT.on('ready', async () => {
    console.log(`Logged in as ${DISCORD_CLIENT.user?.tag}!`);
});

DISCORD_CLIENT.on('message', async (message) => {
    if (!message.author.bot) console.log(`[${message.author.id}] ${message.author.username} ${message.content}`);
    // if (message.author.id !== '198635796851458048') return;
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    try {
        const args = message.content.slice(config.prefix.length).trim().split(' ');
        const command = args.shift()?.toLowerCase();

        if (!command) return;

        const regExp = /[^0-9a-zA-Z^,^.]+/gi;

        if (regExp.test(command) || args.some((a) => regExp.test(a))) {
            const embed = new MessageEmbed();

            embed.setTitle(`A requisição contém caracteres inválidos!`);
            embed.setDescription(`Tente digitando:\n\`!ajuda\``);
            embed.setColor(0xff0000);

            await message.channel.send(embed);
            return;
        }

        const { cryptos }: { cryptos: Record<string, { color: string }> } = config;

        if (command === 'help' || command === 'ajuda') {
            const embed = new MessageEmbed();

            embed.setTitle(`Exibindo comandos disponíveis`);
            embed.addField('`!ajuda`', 'exibe uma lista contendo os comandos disponíveis');
            embed.addField('`!from <moeda A> to <moeda B>`', 'retorna a conversão de 1 unidade da `moeda A` para o valor atual em `moeda B`');
            embed.addField(
                '`!convert <número> <moeda A> to <moeda B>`',
                'retorna a conversão do valor (número) informado em `moeda A` para o valor atual em `moeda B`'
            );
            embed.setColor(0x008fff);

            await message.channel.send(embed);
            return;
        }

        if (command === 'from') {
            if (args.length > 3) {
                const embed = new MessageEmbed();

                embed.setTitle(`A requisição possuí muitos parâmetros.`);
                embed.setDescription(`Tente digitando:\n\`!from btc to usd\``);
                embed.setColor(0xff0000);

                await message.channel.send(embed);
                return;
            }

            const [from, , to] = args;

            const logEmbed = new MessageEmbed();

            logEmbed.setTitle(`Processando operação`);
            logEmbed.setColor(0xffff00);

            let logMessage = await message.channel.send(logEmbed);

            const selector = 'em.cmc-converter__conversion-result';
            const conversorUrl = `https://coinmarketcap.com/converter/${encodeURI(from)}/${encodeURI(to)}/?amt=1`;

            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            await page.goto(conversorUrl);

            const conversionResult = await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);

            logEmbed.setTitle(`Página carregada.`);
            logMessage = await logMessage.edit(logEmbed);

            if (!conversionResult) {
                await page.close();
                await browser.close();

                const embed = new MessageEmbed();

                embed.setTitle(`Não foi possível encontar moeda para realizar a conversão.`);
                embed.setDescription(`[Ver lista de moedas suportadas](https://coinmarketcap.com/tokens/views/all/)`);
                embed.setColor(0xff0000);

                await logMessage.delete();
                await message.channel.send(embed);
                return;
            }

            logEmbed.setTitle(`Processando resultados.`);
            logMessage = await logMessage.edit(logEmbed);

            const priceEl = await page.$(selector);
            const convertionResult = await page.evaluate((el) => el.textContent, priceEl);

            await page.close();
            await browser.close();

            const embed = new MessageEmbed();

            embed.setTitle(`1 ${from.toUpperCase()} = ${convertionResult} ${to.toUpperCase()}`);
            embed.setDescription(`[Ir para a página](${conversorUrl})`);
            embed.setFooter(`Ultima atualização`);
            embed.setTimestamp(new Date());
            embed.setColor(cryptos?.[from]?.color || 0x008fff);

            await logMessage.delete();
            await message.channel.send(embed);
        }

        if (command === 'convert') {
            if (args.length > 4) {
                const embed = new MessageEmbed();

                embed.setTitle(`A requisição possuí muitos parâmetros.`);
                embed.setDescription(`Tente digitando:\n\`!convert 10 eth to btc\``);
                embed.setColor(0xff0000);

                await message.channel.send(embed);
                return;
            }

            const [amount, from, , to] = args;

            const logEmbed = new MessageEmbed();

            logEmbed.setTitle(`Processando operação`);
            logEmbed.setColor(0xffff00);

            let logMessage = await message.channel.send(logEmbed);

            const selector = 'em.cmc-converter__conversion-result';
            const conversorUrl = `https://coinmarketcap.com/converter/${encodeURI(from)}/${encodeURI(to)}/?amt=${amount}`;

            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            await page.goto(conversorUrl);

            const conversionResult = await page.waitForSelector(selector, { timeout: 5000 }).catch(() => null);

            logEmbed.setTitle(`Página carregada.`);
            logMessage = await logMessage.edit(logEmbed);

            if (!conversionResult) {
                await page.close();
                await browser.close();

                const embed = new MessageEmbed();

                embed.setTitle(`Não foi possível encontar moeda para realizar a conversão.`);
                embed.setDescription(`[Ver lista de moedas suportadas](https://coinmarketcap.com/tokens/views/all/)`);
                embed.setColor(0xff0000);

                await logMessage.delete();
                await message.channel.send(embed);
                return;
            }

            logEmbed.setTitle(`Processando resultados.`);
            logMessage = await logMessage.edit(logEmbed);

            const priceEl = await page.$(selector);
            const convertionResult = await page.evaluate((el) => el.textContent, priceEl);

            await page.close();
            await browser.close();

            const embed = new MessageEmbed();

            embed.setTitle(`${amount} ${from.toUpperCase()} = ${convertionResult} ${to.toUpperCase()}`);
            embed.setDescription(`[Ir para a página](${conversorUrl})`);
            embed.setFooter(`Ultima atualização`);
            embed.setTimestamp(new Date());
            embed.setColor(cryptos?.[from]?.color || 0x008fff);

            await logMessage.delete();
            await message.channel.send(embed);
        }
    } catch (error) {
        const embed = new MessageEmbed();

        const protocolId = `0x${Math.round(Math.random() * 100000)}`;

        embed.setTitle(`Erro ao processar requisição.`);
        embed.setDescription(`[Número do protocolo ${protocolId}](http://google.com/search?q=${encodeURI(protocolId)})`);
        embed.setColor(0xff0000);

        await message.channel.send(embed);
    }
});

DISCORD_CLIENT.login(config.bot.token);
