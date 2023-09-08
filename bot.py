import aiohttp
import discord
import asyncio
import openai
import os
import random

from twocaptcha import TwoCaptcha
from capsolver_python import HCaptchaTask

from python3_capsolver.hcaptcha import HCaptcha
from python3_capsolver.hcaptcha import HCaptchaClassification


import sqlite3
from sqlite3 import Error

capsolver = HCaptchaTask("CAP-7705DF5311D61C2138F36D70CF0CDEAC")
openai.api_key = "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"

def init_db():
    try:
        conn = sqlite3.connect("members.db")
        cursor = conn.cursor()
        cursor.execute("""CREATE TABLE IF NOT EXISTS messaged_members (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            member_id TEXT NOT NULL UNIQUE
                          );""")
        conn.commit()
        conn.close()
    except Error as e:
        print(e)

def check_member(member_id):
    conn = sqlite3.connect("members.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messaged_members WHERE member_id=?", (member_id,))
    data = cursor.fetchone()
    conn.close()
    return data

def insert_member(member_id):
    conn = sqlite3.connect("members.db")
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO messaged_members (member_id) VALUES (?)", (member_id,))
    conn.commit()
    conn.close()

class CaptchaSolver(discord.CaptchaHandler):
    def solve_captcha(self, data: dict, proxy: str, proxy_auth: aiohttp.BasicAuth) -> str:
        print('trying to solve captcha...')

        result = HCaptcha(
            api_key='CAP-7705DF5311D61C2138F36D70CF0CDEAC',
            captcha_type='HCaptchaTurboTask',
            websiteURL='https://discord.com/channels/@me',
            websiteKey=data['captcha_sitekey'],
            isInvisible=True,
            enterprisePayload= {
                'rqdata': data['captcha_rqdata']
            },
            userAgent=client.http.user_agent,
            proxyType='http',
            proxyAddress='p.tokenu.to',
            proxyPort=10000,
            proxyLogin='1lnnnl72',
            proxyPassword='akcacu9l',
        ).captcha_handler()

        if result.errorId == 1:
            print(result)
        solution = result.solution

        if solution:
            token = solution['gRecaptchaResponse']
            return token
        
    async def fetch_token(self, data: dict, proxy: str, proxy_auth: aiohttp.BasicAuth) -> str:
        loop = asyncio.get_running_loop()
        #return await loop.run_in_executor(None, self.two_captcha, data, proxy, proxy_auth)
        #return await loop.run_in_executor(None, self.solve_captcha, data, proxy, proxy_auth)
        return await loop.run_in_executor(None, self.solve_captcha, data, proxy, proxy_auth)

class MyClient(discord.Client):
    async def on_ready(self):
        print(f'Logged on as {self.user}')
        print(f"Bot is in {len(self.guilds)} guilds\n")
        init_db()
        
        servers = open("servers.txt", "r").readlines()
        for server in servers:
            server = server.strip()
            try:
                await self.fetch_invite(server)

                print(f"Joining server {server}")
                await self.accept_invite(server)
                print(f"Joined server {server}")
                #await asyncio.sleep(5 + (25 * random.random()))
            except discord.errors.HTTPException as e:
                print(f"An HTTP exception occurred with server {server}: {e}")
                print(f"Trying to join {server} again...")
                try:
                    await self.accept_invite(server)
                    print(f"Joined server {server}")
                except discord.errors.HTTPException as e:
                    print(f"An HTTP exception occurred with server {server}: {e}")
                    continue
            except Error as e:
                print(f"An error occurred with server {server}: {e}")
                continue

        print("Joined all servers\n")

        members = []
        for guild in self.guilds:
            print(f"Checking server {guild.name}")
            print(f"Server {guild.name} has {guild.member_count} members\n")

            await guild.chunk()
            for member in guild.members:
                if member.guild_permissions.manage_guild:
                    members.append(member)

        for member in members:
            await asyncio.sleep(5 + (25 * random.random()))
            if check_member(str(member.id)) is None:
                try:
                    response = openai.Completion.create(
                        engine="gpt-3.5-turbo", 
                        prompt=f"Please take this message and reword it and make it simple and concise but friendly: Hello, I am a recruiter for a crypto company. We are looking for people to fill a job position. If you are interested, please reply to this message.",
                        max_tokens=100 
                    )
                    bot_response = response.choices[0].text.strip()
                    print(bot_response)
                    await member.send(bot_response)
                    print(f"Sent message to {member.name}")
                except Exception as e:
                    bot_response = f"An error occurred: {e}"
                insert_member(str(member.id))

    async def on_message(self, message):
        if message.author == self.user:
            return

        if message.guild is None:
            await message.channel.send(f'Hello, {message.author.name}. You sent me a DM!')
            user_input = message.content
            try:
                response = openai.Completion.create(
                    engine="gpt-3.5-turbo",
                    prompt=f"Act like you are a crypto recruiter and you are having a conversation with a user this is their message: {user_input}\n",
                    max_tokens=50
                )
                bot_response = response.choices[0].text.strip()
            except Exception as e:
                bot_response = f"An error occurred: {e}"

            await message.channel.send(bot_response)

client = MyClient(chunk_guilds_at_startup=True,captcha_handler=CaptchaSolver())  

client.run('NzcyNjAyNDgzOTEwMjQ2NDEx.G9horf.BwWuKX6Q3ZZBM_R5TxcyGYIs11-Oao4J8Xh4tg')
    

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
