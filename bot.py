import discord
import asyncio
import openai
import os


openai.api_key = "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"

class MyClient(discord.Client):
    async def on_ready(self):
        print(f'Logged on as {self.user}')
        
        #go through servers.txt and join all servers
        servers = open("servers.txt", "r").readlines()
        for server in servers:
            server = server.strip()
            try:
                #join server from invite link
                await self.accept_invite(server)
                print(f"Joined server {server}")
            except discord.errors.HTTPException as e:
                print(f"An HTTP exception occurred with server {server}: {e}")
                continue
            except discord.errors.NotFound:
                print(f"Server {server} is invalid")
                continue
            except discord.errors.InvalidInvite:
                print(f"Server {server} is invalid")
                continue
            except discord.errors.Forbidden:
                print(f"Server {server} is invalid")
                continue

        members = []
        #for each server the bot is in create an array of all the members that have manage server permissions
        for guild in self.guilds:
            print(f"Checking server {guild.name}")
            
            for member in guild.members:
                if member.guild_permissions.manage_guild:
                    members.append(member)
            #if there are no members with manage server permissions, leave the server
            if len(members) == 0:
                print(f"Leaving server {guild.name}")
                await guild.leave()
            else:
                print(f"Server {guild.name} is valid")

        for member in members:
            #send them a message asking if they are interested in crypto job position
            await member.send("Hello, I am a recruiter for a crypto company. We are looking for people to fill a job position. If you are interested, please reply to this message.")

    async def on_message(self, message):
        if message.author == self.user:
            return

        if message.guild is None:  # Check if the message is a DM
            await message.channel.send(f'Hello, {message.author.name}. You sent me a DM!')
            user_input = message.content
            try:
                response = openai.Completion.create(
                    engine="gpt-3.5-turbo",  # You can use other engines
                    prompt=f"{user_input}\n",
                    max_tokens=50  # Limit the number of tokens in the response
                )
                bot_response = response.choices[0].text.strip()
            except Exception as e:
                bot_response = f"An error occurred: {e}"

            await message.channel.send(bot_response)

intents = discord.Intents.default()
client = MyClient(intents=intents)

client.run('ODY3MjMyODExMzY1NDMzMzU0.YSm_Wg.yl1U9qhMCxjr1siYbtctVDQWl5E')

    

"""async def main():
    token_list = open("token.txt", "r").readlines()

    for token in token_list:
        token = token.strip()  # Remove any extra whitespace

        intents = discord.Intents.default()
        client = MyClient(intents=intents)
        
        try:
            await client.start(token)
        except discord.errors.LoginFailure:
            print(f"Token {token} is invalid")
            continue
        except discord.errors.HTTPException as e:
            print(f"An HTTP exception occurred with token {token}: {e}")
            continue

        if client.is_closed():
            print(f"Token {token} is invalid")
        else:
            print(f"Token {token} is valid")

if __name__ == "__main__":
    asyncio.run(main())"""
