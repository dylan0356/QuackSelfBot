
import discord

class MyClient(discord.Client):
    async def on_ready(self):
        print('Logged on as', self.user)

    async def on_message(self, message):
        # only respond to ourselves
        if message.author != self.user:
            return

        if message.content == 'ping':
            await message.channel.send('pong')


token_list = open("token.txt", "r").readlines()

for token in token_list:
    client = MyClient()
    
    try:
        client.run(token)
    except discord.errors.LoginFailure:
        print("Token " + token + " is invalid")
        continue
    

    if client.is_closed():
        print("Token " + token + " is invalid")

    else:
        print("Token " + token + " is valid")

        await client.close()