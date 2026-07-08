const { Client } = require('discord.js-selfbot-v13');

const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const sodium = require('libsodium-wrappers');

// --- تهيئة sodium للتشفير ---

(async () => {

  await sodium.ready;

  console.log('🔐 Sodium crypto library initialized - مكتبة التشفير جاهزة');

})();

const client = new Client();

// ---- إعدادات البوت ----

let voiceConnection = null;

let presenceInterval = null;

let reconnectAttempts = 0;

const maxReconnectAttempts = 3;

// ضع التوكن هنا مباشرة

const TOKEN = "MTA1MTgxNjc2NTY2MDg2MDQxNw.GZJoTp.p26TGcPwWzMs0hhyVLeFvUo2LXe-2JP4QLg3nk";

const GUILD_ID = "930396594409467925";

const CHANNEL_ID = "1359310212489809930";

// --- دالة الانضمام للفويس مع إعادة المحاولة ---

async function joinVoiceChannelWithRetry() {

  if (!GUILD_ID || !CHANNEL_ID) {

    console.log("❌ Please set GUILD_ID and CHANNEL_ID variables");

    return;

  }

  try {

    const guild = await client.guilds.fetch(GUILD_ID);

    const channel = await guild.channels.fetch(CHANNEL_ID);

    if (!channel) {

      console.log("❌ Voice channel not found");

      return;

    }

    console.log(`📋 Channel info: ${channel.name} (Type: ${channel.type})`);

    if (channel.type !== 'GUILD_VOICE' && channel.type !== 2 && channel.type !== 'voice') {

      console.log("❌ Channel is not a voice channel");

      return;

    }

    console.log(`🔄 Attempting to join voice channel: ${channel.name}`);

    voiceConnection = joinVoiceChannel({

      channelId: channel.id,

      guildId: guild.id,

      adapterCreator: guild.voiceAdapterCreator,

      selfDeaf: true,

      selfMute: true,

    });

    voiceConnection.on(VoiceConnectionStatus.Ready, () => {

      console.log('🔊 Successfully joined voice channel! - دخلت الفويس بنجاح');

      reconnectAttempts = 0;

      client.user.setActivity(`In ${channel.name}`, { type: 'LISTENING' });

    });

    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {

      console.log('⚠️ Voice connection disconnected');

      if (reconnectAttempts < maxReconnectAttempts) {

        reconnectAttempts++;

        console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);

        setTimeout(joinVoiceChannelWithRetry, 5000);

      } else {

        console.log('❌ Max reconnection attempts reached');

        voiceConnection = null;

      }

    });

    voiceConnection.on('error', error => {

      console.error('❌ Voice connection error:', error.message);

      if (reconnectAttempts < maxReconnectAttempts) {

        reconnectAttempts++;

        setTimeout(() => {

          if (voiceConnection) voiceConnection.destroy();

          joinVoiceChannelWithRetry();

        }, 5000);

      }

    });

    await entersState(voiceConnection, VoiceConnectionStatus.Ready, 30000);

  } catch (error) {

    console.error("❌ Error joining voice channel:", error.message);

    if (reconnectAttempts < maxReconnectAttempts) {

      reconnectAttempts++;

      setTimeout(joinVoiceChannelWithRetry, 5000);

    }

  }

}

// --- أحداث البوت ---

client.on("ready", async () => {

  console.log(`${client.user.username} ✅ Logged in successfully`);

  await joinVoiceChannelWithRetry();

  presenceInterval = setInterval(() => {

    if (client.user && !voiceConnection) {

      client.user.setActivity('Trying to join voice...', { type: 'PLAYING' });

    }

  }, 300000); // كل 5 دقايق

});

client.on('voiceStateUpdate', (oldState, newState) => {

  if (newState.channelId === CHANNEL_ID && oldState.channelId !== CHANNEL_ID) {

    console.log(`👋 ${newState.member.displayName} joined the voice channel`);

  }

  if (oldState.channelId === CHANNEL_ID && newState.channelId !== CHANNEL_ID) {

    console.log(`👋 ${oldState.member.displayName} left the voice channel`);

  }

  if (oldState.member?.id === client.user.id && oldState.channelId === CHANNEL_ID) {

    console.log('⚠️ Bot was removed from voice channel, attempting to rejoin...');

    setTimeout(joinVoiceChannelWithRetry, 2000);

  }

});

client.on("error", error => console.error("❌ Discord client error:", error));

process.on('SIGINT', () => {

  console.log("\n🔄 Shutting down bot...");

  if (presenceInterval) clearInterval(presenceInterval);

  if (voiceConnection) voiceConnection.destroy();

  client.destroy();

  process.exit(0);

});

process.on('unhandledRejection', reason => console.error('❌ Unhandled Promise Rejection:', reason));

process.on('uncaughtException', error => {

  console.error('❌ Uncaught Exception:', error);

  process.exit(1);

});

// --- تسجيل الدخول ---

console.log('👤 Starting with your personal Discord account...');

client.login(TOKEN).catch(error => {

  console.error('❌ Login failed:', error.message);

});