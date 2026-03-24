require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot is online als ${client.user.tag}!`);
    console.log(`Luistert naar kanaal ID: ${process.env.JOURNAL_CHANNEL_ID}`);

// AUTOMATISCH AFSLUITEN NA 2 UUR (7.200.000 ms)
 setTimeout(() => {
     console.log('Tijd is om (2 uur verstreken). Bot sluit netjes af voor GitHub Actions!');
     client.destroy();
     process.exit(0); 
 }, 9000000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === process.env.JOURNAL_CHANNEL_ID && message.attachments.size > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('confluence_select')
            .setPlaceholder('Vink je confluences aan...')
            .setMinValues(1)
            .setMaxValues(5)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Killzone').setDescription('Trade genomen binnen een ICT Killzone').setValue('Killzone').setEmoji('🎯'),
                new StringSelectMenuOptionBuilder().setLabel('Premium / Discount').setDescription('Trade genomen in de juiste PD Array').setValue('Premium/Discount').setEmoji('⚖️'),
                new StringSelectMenuOptionBuilder().setLabel('Liquidity Sweep').setDescription('Prijs heeft zojuist liquiditeit opgehaald').setValue('Liquidity Sweep').setEmoji('🧹'),
                new StringSelectMenuOptionBuilder().setLabel('FVG (Fair Value Gap)').setDescription('Instap op een FVG').setValue('FVG').setEmoji('🧲'),
                new StringSelectMenuOptionBuilder().setLabel('Market Structure Shift').setDescription('BOS of MSS gespot').setValue('MSS').setEmoji('📉')
            );

        const row = new ActionRowBuilder().addComponents(select);

        await message.reply({
            content: 'Selecteer de confluences voor deze trade:',
            components: [row]
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'confluence_select') {
        const geselecteerd = interaction.values;
        let resultaatTekst = `**Confluences voor deze trade:**\n`;
        geselecteerd.forEach(keuze => {
            resultaatTekst += `✅ ${keuze}\n`;
        });

        await interaction.update({ 
            content: resultaatTekst, 
            components: [] 
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
