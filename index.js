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
    
    // Automatisch afsluiten na 2,5 uur voor GitHub Actions
    setTimeout(() => {
        console.log('Tijd is om. Bot sluit netjes af!');
        client.destroy();
        process.exit(0); 
    }, 9000000); 
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === process.env.JOURNAL_CHANNEL_ID && message.attachments.size > 0) {
        
        // AANGEPAST: 50% Tap is toegevoegd en maxValues is verhoogd
        const select = new StringSelectMenuBuilder()
            .setCustomId('confluence_select')
            .setPlaceholder('Vink je confluences aan...')
            .setMinValues(1)
            .setMaxValues(8) // Verhoogd naar 8
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
            content: 'Selecteer de confluences voor deze trade:',
            components: [row]
        });
    }
});

// Tijdelijke opslag voor de gekozen confluences
const tempTradeData = new Map();

client.on('interactionCreate', async (interaction) => {
    
    // STAP 1: De dropdown is ingevuld
    if (interaction.isStringSelectMenu() && interaction.customId === 'confluence_select') {
        const geselecteerd = interaction.values;
        tempTradeData.set(interaction.message.id, geselecteerd);

        // Maak de pop-up (Modal) aan
        const modal = new ModalBuilder()
            .setCustomId(`trade_details_${interaction.message.id}`)
            .setTitle('Trade Details Toevoegen');

        // Input 1: Cijfer
        const gradeInput = new TextInputBuilder()
            .setCustomId('trade_grade')
            .setLabel('Cijfer (B, B+, A-, A, A+)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2);

        // Input 2: Profit / Loss (NIEUW)
        const pnlInput = new TextInputBuilder()
            .setCustomId('trade_pnl')
            .setLabel('Profit / Loss (bijv. +$150 of -$50)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(15);

        // Input 3: Sizing (NIEUW)
        const sizingInput = new TextInputBuilder()
            .setCustomId('trade_sizing')
            .setLabel('Sizing (Aantal MNQ contracten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10);

        // Input 4: Notities
        const notesInput = new TextInputBuilder()
            .setCustomId('trade_notes')
            .setLabel('Notities over de trade')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        // Elke input moet in zijn eigen 'ActionRow' zitten
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
        
        // Haal alle ingevulde data op
        const grade = interaction.fields.getTextInputValue('trade_grade').toUpperCase();
        const pnl = interaction.fields.getTextInputValue('trade_pnl');
        const sizing = interaction.fields.getTextInputValue('trade_sizing');
        const notes = interaction.fields.getTextInputValue('trade_notes') || 'Geen notities.';

        const confluencesText = confluences.map(c => `✅ ${c}`).join('\n');

        // Bepaal de kleur van het blokje op basis van winst/verlies (Groen bij +, Rood bij -)
        let embedColor = '#808080'; // Standaard grijs
        if (pnl.includes('+')) embedColor = '#00FF00'; // Groen
        if (pnl.includes('-')) embedColor = '#FF0000'; // Rood

        // Maak het uiteindelijke blokje (Embed) op
        const resultEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Trade Setup Grade: ${grade}`)
            .addFields(
                // inline: true zorgt ervoor dat deze twee netjes naast elkaar komen!
                { name: '💰 Profit / Loss', value: pnl, inline: true },
                { name: '📊 Sizing', value: `${sizing} MNQ`, inline: true },
                { name: '\u200B', value: '\u200B' }, // Lege regel voor wat ademruimte in de opmaak
                { name: '📋 Confluences', value: confluencesText },
                { name: '📝 Notities', value: notes }
            )
            .setTimestamp();

        // Update het originele bericht
        await interaction.update({ 
            content: '', 
            embeds: [resultEmbed],
            components: [] 
        });

        tempTradeData.delete(messageId);
    }
});

client.login(process.env.DISCORD_TOKEN);
