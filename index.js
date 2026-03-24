require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot is online als ${client.user.tag}!`);
    
    setTimeout(() => {
        console.log('Tijd is om. Bot sluit netjes af!');
        client.destroy();
        process.exit(0); 
    }, 9000000); 
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === process.env.JOURNAL_CHANNEL_ID && message.attachments.size > 0) {
        
        // AANGEPAST: We plakken het ID van de poster aan de 'customId' van het menu vast
        const select = new StringSelectMenuBuilder()
            .setCustomId(`confluence_select_${message.author.id}`)
            .setPlaceholder('Vink je confluences aan...')
            .setMinValues(1)
            .setMaxValues(8)
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Killzone').setDescription('9:30-11am EST').setValue('Killzone').setEmoji('🎯'),
                new StringSelectMenuOptionBuilder().setLabel('Premium / Discount').setDescription('Right side of range').setValue('Premium/Discount').setEmoji('⚖️'),
                new StringSelectMenuOptionBuilder().setLabel('Major Liquidity Sweep').setDescription('London/Asia or LOD/HOD').setValue('Liquidity Sweep').setEmoji('🧹'),
                new StringSelectMenuOptionBuilder().setLabel('Instant Reaction').setDescription('No stalling after sweep').setValue('Instant Reaction').setEmoji('⚡'),
                new StringSelectMenuOptionBuilder().setLabel('Strong Momentum').setDescription('Close above/below gap fast').setValue('Strong Momentum').setEmoji('🚀'),
                new StringSelectMenuOptionBuilder().setLabel('Clear Targets').setDescription('Equal highs/lows etc.').setValue('Clear Targets').setEmoji('🎯'),
                new StringSelectMenuOptionBuilder().setLabel('SMT Divergence').setDescription('Correlated asset divergence').setValue('SMT').setEmoji('📉'),
                new StringSelectMenuOptionBuilder().setLabel('50% Tap').setDescription('Price tapped the 50% level').setValue('50% Tap').setEmoji('📏')
            );

        const row = new ActionRowBuilder().addComponents(select);

        await message.reply({
            // Extraatje: we taggen de gebruiker zodat het duidelijk is voor wie het menu is
            content: `<@${message.author.id}>, selecteer de confluences voor deze trade:`,
            components: [row]
        });
    }
});

const tempTradeData = new Map();

client.on('interactionCreate', async (interaction) => {
    
    // STAP 1: De dropdown wordt aangeklikt
    // We checken nu of de ID BEGINT met 'confluence_select_'
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('confluence_select_')) {
        
        // BEVEILIGING: Haal het ID van de originele poster uit de knop-code
        const allowedUserId = interaction.customId.replace('confluence_select_', '');
        
        // Controleer of degene die klikt, de originele poster is
        if (interaction.user.id !== allowedUserId) {
            // 'ephemeral: true' betekent dat het berichtje onzichtbaar is voor de rest van de server
            return interaction.reply({ 
                content: '❌ **Fout:** Je mag alleen de confluences van je eigen trades invullen!', 
                ephemeral: true 
            });
        }

        const geselecteerd = interaction.values;
        tempTradeData.set(interaction.message.id, geselecteerd);

        const modal = new ModalBuilder()
            .setCustomId(`trade_details_${interaction.message.id}`)
            .setTitle('Trade Details Toevoegen');

        const gradeInput = new TextInputBuilder()
            .setCustomId('trade_grade')
            .setLabel('Cijfer (B, B+, A-, A, A+)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2);

        const pnlInput = new TextInputBuilder()
            .setCustomId('trade_pnl')
            .setLabel('Profit / Loss (bijv. +$150 of -$50)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(15);

        const sizingInput = new TextInputBuilder()
            .setCustomId('trade_sizing')
            .setLabel('Sizing (Aantal MNQ contracten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10);

        const notesInput = new TextInputBuilder()
            .setCustomId('trade_notes')
            .setLabel('Notities over de trade')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(gradeInput);
        const secondRow = new ActionRowBuilder().addComponents(pnlInput);
        const thirdRow = new ActionRowBuilder().addComponents(sizingInput);
        const fourthRow = new ActionRowBuilder().addComponents(notesInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);
    }

    // STAP 2: De pop-up is ingevuld en verzonden
    if (interaction.isModalSubmit() && interaction.customId.startsWith('trade_details_')) {
        const messageId = interaction.customId.replace('trade_details_', '');
        const confluences = tempTradeData.get(messageId) || ['Geen data gevonden'];
        
        const grade = interaction.fields.getTextInputValue('trade_grade').toUpperCase();
        const pnl = interaction.fields.getTextInputValue('trade_pnl');
        const sizing = interaction.fields.getTextInputValue('trade_sizing');
        const notes = interaction.fields.getTextInputValue('trade_notes') || 'Geen notities.';

        const confluencesText = confluences.map(c => `✅ ${c}`).join('\n');

        let embedColor = '#808080'; 
        if (pnl.includes('+')) embedColor = '#00FF00'; 
        if (pnl.includes('-')) embedColor = '#FF0000'; 

        const resultEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Trade Setup Grade: ${grade}`)
            .addFields(
                { name: '💰 Profit / Loss', value: pnl, inline: true },
                { name: '📊 Sizing', value: `${sizing} MNQ`, inline: true },
                { name: '\u200B', value: '\u200B' }, 
                { name: '📋 Confluences', value: confluencesText },
                { name: '📝 Notities', value: notes }
            )
            .setTimestamp();

        await interaction.update({ 
            content: `<@${interaction.user.id}>'s Trade Journal:`, 
            embeds: [resultEmbed],
            components: [] 
        });

        tempTradeData.delete(messageId);
    }
});

client.login(process.env.DISCORD_TOKEN);
