const { Client, InteractionType } = require('discord.js');
const Chalk = require('chalk')
const moment = require('moment');
const {GatewayIntentBits, ActivityType } = require('discord.js');

/**
 * 
 * @param {Client} client 
 */
module.exports = (client) => {

    client.user.setPresence({
        activities: [{ name: `To Assault Players`, type: ActivityType.Listening }],
        status: 'Assault Players',
      });



    console.log(Chalk.blueBright(Chalk.bold(`Successfully launched ${client.user.tag} with ${client.guilds.cache.size || 0} guilds at ${new moment().format('LTS')}`)))

    client.guilds.cache.forEach(async guild => {
        await guild.commands.set(
            client.interactions
                .filter(i => i.type == InteractionType.ApplicationCommand)
                .map(i => i.data)
        )
    });
}
