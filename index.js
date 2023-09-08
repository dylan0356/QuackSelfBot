const chalk = require('chalk');
const config = require("./config.json")
const proxyAgent = require('http-proxy-agent');
const fs = require("fs")
const gradient = require("gradient-string")
const OpenAI = require('openai');
const Sequelize = require('sequelize');

const { Client } = require("discord.js-selfbot-v13")

const tokens = fs.readFileSync('tokens.txt', 'utf-8').toString().split('\n');
const proxies = fs.readFileSync('proxies.txt', 'utf-8').toString().split('\n');

const Members = require('./models/members');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false,
});

const MembersDB = Members(sequelize, Sequelize.DataTypes);

var token = tokens.shift()

start(token, tokens)

const openai = new OpenAI({
    apiKey: config.openaiKey,
  });

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function start(token, tokens) {
    console.log(gradient.rainbow("Starting..."))
    let proxy = proxies[Math.floor(Math.random() * proxies.length)]?.replaceAll('\r', '')?.replaceAll('\n', '');

    const client = new Client(
        {
            captchaService: "capmonster",
            captchaKey: config.captchaKey,
            checkUpdate: false,
            http: { agent: new proxyAgent.HttpProxyAgent(proxy) },
            captchaWithProxy: true,
            captchaRetryLimit: 6,
        }
    )
    const serverInvites = fs.readFileSync("servers.txt").toString().split("\n") 

    client.on("rateLimit", async (info) => {
        console.log(chalk.red("Rate limited: ") + gradient.fruit(info))
        
        await delay(50000);
        token = tokens.shift();
        start(token, tokens);

        client.destroy()
    });
        
    client.on("invalidRequest", (info) => {
        console.log(chalk.red("Invalid request - token banned: ") + gradient.fruit(info));
        
        token = tokens.shift();
        start(token, tokens);

        client.destroy()
    });

    client.on("error", (info) => {
        if (info.message.includes("USER_REQUIRED_ACTION")) {
            console.log(chalk.red(info + " ") + chalk.green('Switching to next token...'))

            token = tokens.shift();
            start(token, tokens);

            //close this client connection
            client.destroy()
        }
    });



    client.on("ready", async () => {
        console.log(chalk.green("Logged in as ") + gradient.fruit(client.user.tag))

        console.log(chalk.greenBright("\nTrying to join servers..."))
        for (let i = 0; i < serverInvites.length; i++) {

            console.log(chalk.green("Trying to join ") + gradient.retro(serverInvites[i]))
            
            const inviteCode = serverInvites[i];
            
            await client.fetchInvite(inviteCode).then(async (invite) => {
                await invite.acceptInvite(true).then( async () => {
                    console.log(chalk.green("Joined ") + gradient.retro(invite.guild.name))
                    await delay(10000 + Math.random(0, 5) * 1000);

                }
                ).catch((err) => {
                    if (err.code == 500) {
                        console.log(chalk.red("Failed to join ") + gradient.retro(invite.guild.name) + chalk.red(" because of captcha"))
                        console.log(err)
                        serverInvites.push(inviteCode)
                    }
                    
                    console.log(chalk.red("Failed to join ") + gradient.retro(invite.guild.name))
                }
                )
            }).catch((err) => {
                console.log(chalk.red("Failed to join ") + gradient.retro(inviteCode))
                console.log(err)
            })
        }

        await client.guilds.fetch().then(async (guilds) => {

        if (client.guilds.cache.size == 0) {
            console.log(chalk.red("Attempting to recache, restarting in 20 seconds"))
            setTimeout(() => {
                start(token, tokens)
                client.destroy()
            }, 20000)
            return
        }

        
        //const message = "Hello, I am a recruiter for a crypto company. We are looking for people to fill a job position. You looked like you would be interested in joining our team."

        for (const [guildId, guild] of client.guilds.cache.entries()) {
            await processGuild(guild, client, token, tokens);
        }
        
        async function processGuild(guild, client, token, tokens) {
            return new Promise(async (resolve, reject) => {
                const message = await generateStartingMessage()

                guild.members.fetch().then( async (members) => {
                    console.log(chalk.green("Going through ") + gradient.pastel(guild.name) + chalk.green(", found ") + gradient.fruit(members.size) + chalk.green(" members"))
        
                    for (const member of members.values()) {
                        if (member.user.id == client.user.id) continue;
                        if (member.user.bot) continue;
        
                        if (member.permissions.has(config.permissionToMessage)) {
        
                                console.log(chalk.green("Found member with permission to message ") + gradient.cristal(member.user.tag) + chalk.green(", in guild ") + gradient.pastel(guild.name))
                
                                const result = await MembersDB.findOne({ where: { userId: member.user.id } })
                                    if (result) {
                                        console.log(chalk.red("Member is in database, not messaging ") + gradient.cristal(member.user.tag))
                                    } else {    
                                            console.log(chalk.green("Sending message to ") + gradient.cristal(member.user.tag))
                                            try {
        
                                                await member.send(message).then( async () => {
                                                    console.log(chalk.green("Sent message to ") + gradient.cristal(member.user.tag))
        
                                                    MembersDB.create({
                                                        userId: member.user.id,
                                                        username: member.user.tag,
                                                    }).then( async () => {
                                                        console.log(chalk.green("Added ") + gradient.cristal(member.user.tag) + chalk.green(" to database"))
        
                                                    }
                                                    ).catch((err) => {
                                                        console.log(chalk.red("Failed to add ") + gradient.cristal(member.user.tag) + chalk.red(" to database"))
                                                        console.log(err)
                                                    }
                                                    )
                                
                                                }).catch((err) => {
                                                    console.log(chalk.red("Failed to send message to ") + gradient.cristal(member.user.tag) + chalk.red(" because of they have DMs off"))
        
                                                    //add to database
                                                    MembersDB.create({
                                                        userId: member.user.id,
                                                        username: member.user.tag,
                                                    }).then( async () => {
                                                        console.log(chalk.green("Added ") + gradient.cristal(member.user.tag) + chalk.green(" to database"))
                                                    }
                                                    ).catch((err) => {
                                                        console.log(chalk.red("Failed to add ") + gradient.cristal(member.user.tag) + chalk.red(" to database"))
                                                        console.log(err)
                                                    }
                                                    )
                                                })
        
                                                await delay(config.timeBetweenInitalMessaging + Math.random(0, 10) * 1000);
                                            } catch (err) {
                                                console.log(chalk.red("Failed to send message to ") + gradient.cristal(member.user.tag) + chalk.red(" because of they have DMs off"))
        
                                                //add to database
                                                MembersDB.create({
                                                    userId: member.user.id,
                                                    username: member.user.tag,
                                                }).then(() => {
                                                    console.log(chalk.green("Added ") + gradient.cristal(member.user.tag) + chalk.green(" to database"))
                                                }
                                                ).catch((err) => {
                                                    console.log(chalk.red("Failed to add ") + gradient.cristal(member.user.tag) + chalk.red(" to database"))
                                                    console.log(err)
                                                }
                                                )
                                            }
                                        
                                        
                                    }
        
                            
                        }
        
                    }
                    console.log(chalk.green("Done with ") + gradient.pastel(guild.name) + chalk.green(", checked ") + gradient.fruit(members.size) + chalk.green(" members"))
                    resolve();

                }).catch((err) => {
                    console.log(chalk.red("Failed to fetch members for ") + gradient.pastel(guild.name))
                    console.log(err)

                    resolve();
                })

            });
        }
        
        
    }).catch((err) => {
        console.log(chalk.red("Failed to fetch guilds"))
        console.log(err)
    })
})

    //on guild join
    client.on("guildCreate", async (guild) => {
        //log restarting
        console.log(chalk.green("Restarting..."))
        start(token, tokens)

        client.destroy()
    })

    client.on("messageCreate", async (message) => {
        //if the message is from a dm
        if (message.channel.type == "DM") {
            if (message.author.bot) return
            if (message.author.id == client.user.id) return
            console.log(chalk.green("Got message from ") + gradient.cristal(message.author.tag))
            setTimeout(() => { respondToDm(message) }, (config.timeBetweenMessages+ Math.random(0,5)) * 1000)            
        }
    })

    async function respondToDm(message) {
        await message.channel.sendTyping()

        if (message.author.bot) return

        var response = ""

        try{

            try {
                const previousMessage = await message.channel.messages.fetch({ limit: 2 }).then(messages => messages.last())

                response = await generateMessage(message.content, previousMessage.content)
            } catch (err) {
                console.log(err)
                response = await generateMessage(message.content, "")
            }
        } catch (err) {
            console.log(chalk.red("Failed to generate message for ") + gradient.cristal(message.author.tag) + chalk.red(" trying again in 20 seconds")) 
            setTimeout(() => {
                respondToDm(message)
            }, 20000)
            return
        }

        message.channel.send(response).then(() => {
            console.log(chalk.green("Sent message DM reply to ") + gradient.cristal(message.author.tag))
        }).catch((err) => {
            console.log(chalk.red("Failed to send message to ") + gradient.cristal(message.author.tag))
            console.log(err)
        })
    }


                

    async function generateStartingMessage() {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: config.startingPrompt }],
            model: 'gpt-3.5-turbo',
        });
        const message = completion.choices[0].message.content
        if (config.printGeneratedMessages) { console.log(chalk.green("Generated message: ") + gradient.teen(message)) }
        return message
    }

    async function generateMessage(input, prevMessage) {
        input = config.replyToDMPrompt + " [" + input + "]. \n\nThis is the previous message that you the bot had sent to the user. I am giving this to help provide context to the situation for you to understand. Do not repeat this response again to the user : (" + prevMessage + ")"
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: input }],
            model: 'gpt-3.5-turbo',
        });
        const message = completion.choices[0].message.content
        if (config.printGeneratedMessages) { console.log(chalk.green("Generated message: ") + gradient.teen(message)) }
        return message
    }



    token = token.trim()?.replace("\r", "")?.replace("\n", "")

    client.login(token).catch((err) => {
        console.log(chalk.red("Failed to login with token ") + gradient.cristal(token))
        if (tokens.length > 0) {
            start(tokens.shift(), tokens)
            
            client.destroy()
        } else {
            console.log(chalk.red("No more tokens to try"))
        }
    })
}





