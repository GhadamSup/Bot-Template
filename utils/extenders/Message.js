const { Message, APIMessage, StringResolveable, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { colors } = require('../../config/config.json');
const assets = require('../../config/assets.json');

Message.prototype.reacts = async function (...reactions) {
    reactions.forEach(r => this.react(r))
}

/**
 * 
 * @param {string} description 
 * @param {string} image 
 */
Message.prototype.error = function (description, image) {
    const embed = new EmbedBuilder()
        .setDescription(description)
        .setColor(colors.error)
        .setThumbnail(assets.icons.error);

    var attachment;
    if (image) {
        if (fs.existsSync(image)) {
            attachment = new AttachmentBuilder(image, path.basename(image))
            embed.setImage(`attachment://${path.basename(image)}`)
        } else {
            embed.setImage(image)
        }
    }

    this.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
        ...(attachment ? { files: [attachment] } : {})
    });
}

/**
 * 
 * @param {StringResolveable | APIMessage} content 
 * @param {{
 *  page?: number,
 *  time?: number
 * }} options 
 */

Message.prototype.post = async function (content, options) {
    options = {
        page: 1,
        time: 120000,
        allowedMentions: {
            repliedUser: false
        },
        ...options
    }

    if (typeof content === "string") return this.reply({
        content: content,
        ...options
    });

    if (typeof content === "object" && !content.pages && !Array.isArray(content)) {
        if (content.data) return this.reply({
            embeds: [content],
            allowedMentions: options.allowedMentions
        })

        return this.reply({
            ...content,
            allowedMentions: options.allowedMentions
        })
    }

    if (content.pages) {
        let pages = content.pages.map((page, index) => {
            Object.keys(content.data).forEach(key => {
                if (typeof key !== 'string' || key === 'pages') return;
                if (!page.data[key]) page.data[key] = content.data[key]
                if (key === 'author' && content.data[key] && content.data[key].iconURL && !page.data[key].iconURL) page.data[key].iconURL = content.data[key].iconURL
                if (key === 'fields') page.data[key].unshift(content.data[key])
            });

            if (content.footer) {
                const { text } = content.footer;
                if (text) {
                    page.setFooter({
                        ...content.footer,
                        text: `『 Page ${index + 1}/${content.pages.length} 』${text}`
                    })
                }
            } else {
                page.setFooter({ text: `『 Page ${index + 1}/${content.pages.length} 』` })
            }

            return page
        });

        const sending = pages.map(page => ({
            embeds: [page],
            files: content.files || [],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setEmoji('◀️')
                            .setStyle('Secondary')
                            .setCustomId('prev'),
                        new ButtonBuilder()
                            .setEmoji('▶️')
                            .setStyle('Secondary')
                            .setCustomId('next'),
                        new ButtonBuilder()
                            .setEmoji('⏹️')
                            .setStyle('Secondary')
                            .setCustomId('stop'),
                    )
            ],
            allowedMentions: {
                repliedUser: false
            }
        }));

        let { page, time } = options;

        const msg = await this.reply(sending[page - 1]);

        if (sending.length === 1) return;

        const collector = msg.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === this.author.id,
            time: time
        });

        collector.on("collect", async (interaction) => {
            interaction.deferUpdate();

            switch (interaction.customId) {
                case "next":
                    page = page < sending.length ? page + 1 : 1;
                    break;
                case "prev":
                    page = page > 1 ? page - 1 : sending.length;
                    break;
                case "stop":
                    collector.stop();
                    return;
            }

            sending[page - 1].content = sending[page - 1].content || "\u200b"
            msg.edit(sending[page - 1]);
        });

        collector.on("end", _ => {
            sending[page - 1].components = []
            msg.edit(sending[page - 1]);
        });
    }
}
