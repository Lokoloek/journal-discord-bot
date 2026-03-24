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
        
        // AANGEPAST: De nieuwe lijst met jouw specifieke confluences
        const select = new StringSelectMenuBuilder()
            .setCustomId('confluence_select')
            .setPlaceholder('Vink je confluences aan...')
            .setMinValues(1)
            .setMaxValues(7) // Maximaal 7 opties
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Killzone').setDescription('9:30-11am EST').setValue('Killzone').setEmoji('🎯'),
                new StringSelectMenuOptionBuilder().setLabel('Premium / Discount').setDescription('Right side of range').setValue('Premium/Discount').setEmoji('⚖️'),
                new StringSelectMenuOptionBuilder().setLabel('Major Liquidity Sweep').setDescription('London/Asia or LOD/HOD').setValue('Liquidity Sweep').setEmoji('🧹'),
                new StringSelectMenuOptionBuilder().setLabel('Instant Reaction').setDescription('No stalling after sweep').setValue('Instant Reaction').setEmoji('⚡'),
                new StringSelectMenuOptionBuilder().setLabel('Strong Momentum').setDescription('Close above/below gap fast').setValue('Strong Momentum').setEmoji('🚀'),
                new StringSelectMenuOptionBuilder().setLabel('Clear Targets').setDescription('Equal highs/lows etc.').setValue('Clear Targets').setEmoji('🎯'),
                new StringSelectMenuOptionBuilder().setLabel('SMT Divergence').setDescription('Correlated asset divergence').setValue('SMT').setEmoji('📉')
            );

        const row = new ActionRowBuilder().addComponents(select);

        await message.reply({
            content: 'Selecteer de confluences voor deze trade:',
            components: [row]
        });
    }
});

// Tijdelijke opslag voor de gekozen confluences totdat de modal is ingevuld
const tempTradeData = new Map();

client.on('interactionCreate', async (interaction) => {
    
    // STAP 1: De dropdown is ingevuld
    if (interaction.isStringSelectMenu() && interaction.customId === 'confluence_select') {
        const geselecteerd = interaction.values;
        
        // Sla de gekozen confluences tijdelijk op o.b.v. bericht ID
        tempTradeData.set(interaction.message.id, geselecteerd);

        // Maak de pop-up (Modal) aan voor het Cijfer en de Notitie
        const modal = new ModalBuilder()
            .setCustomId(`trade_details_${interaction.message.id}`)
            .setTitle('Trade Details Toevoegen');

        // Input voor Cijfer
        const gradeInput = new TextInputBuilder()
            .setCustomId('trade_grade')
            .setLabel('Cijfer (B, B+, A-, A, A+)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2);

        // Input voor Notities
        const notesInput = new TextInputBuilder()
            .setCustomId('trade_notes')
            .setLabel('Notities over de trade')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false); // Niet verplicht

        const firstActionRow = new ActionRowBuilder().addComponents(gradeInput);
        const secondActionRow = new ActionRowBuilder().addComponents(notesInput);

        modal.addComponents(firstActionRow, secondActionRow);

        // Toon de modal aan de gebruiker
        await interaction.showModal(modal);
    }

    // STAP 2: De pop-up (Modal) is ingevuld en verzonden
    if (interaction.isModalSubmit() && interaction.customId.startsWith('trade_details_')) {
        // Haal het originele bericht ID uit de customId
        const messageId = interaction.customId.replace('trade_details_', '');
        
        // Haal de opgeslagen confluences op
        const confluences = tempTradeData.get(messageId) || ['Geen data gevonden'];
        
        // Haal de ingevulde data uit de pop-up
        const grade = interaction.fields.getTextInputValue('trade_grade').toUpperCase();
        const notes = interaction.fields.getTextInputValue('trade_notes') || 'Geen notities.';

        // Maak een mooi lijstje van de confluences
        const confluencesText = confluences.map(c => `✅ ${c}`).join('\n');

        // Maak een net blokje (Embed) voor het eindresultaat
        const resultEmbed = new EmbedBuilder()
            .setColor(grade.includes('A') ? '#00FF00' : '#FFA500') // Groen voor A, Oranje voor B
            .setTitle(`Trade Setup Grade: ${grade}`)
            .addFields(
                { name: '📋 Confluences', value: confluencesText },
                { name: '📝 Notities', value: notes }
            )
            .setTimestamp();

        // Update het originele bericht: verwijder dropdown en stuur de embed
        await interaction.update({ 
            content: '', 
            embeds: [resultEmbed],
            components: [] 
        });

        // Verwijder data uit geheugen
        tempTradeData.delete(messageId);
    }
});

client.login(process.env.DISCORD_TOKEN);
