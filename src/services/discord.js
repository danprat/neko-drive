const axios = require("axios");
const logger = require("../utils/logger");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Global Cooldown State (Multi-User Optimization)
let globalCooldownUntil = 0;

const checkCooldown = async () => {
    const now = Date.now();
    if (now < globalCooldownUntil) {
        const wait = globalCooldownUntil - now;
        await new Promise(r => setTimeout(r, wait));
    }
};

/**
 * Robustly delete a message from Discord with retry on 429
 */
const deleteMessage = async (messageId, retryCount = 0) => {
    const maxRetries = 3;
    if (!messageId || !BOT_TOKEN || !CHANNEL_ID) return;

    await checkCooldown();

    try {
        await axios.delete(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${messageId}`, {
            headers: { "Authorization": `Bot ${BOT_TOKEN}` }
        });
    } catch (e) {
        if (e.response?.status === 404) return; // Already gone
        if (e.response?.status === 429 && retryCount < maxRetries) {
            const retryAfter = (e.response.data?.retry_after || 1) * 1000;
            globalCooldownUntil = Date.now() + retryAfter; // Set global cooldown
            logger.warn(`[Discord] Rate limited. Retrying after ${retryAfter}ms`);
            await new Promise(r => setTimeout(r, retryAfter + 100)); // Add buffer
            return deleteMessage(messageId, retryCount + 1);
        }
        logger.error(`[Discord] Failed to delete msg ${messageId}:`, e.message);
    }
};

/**
 * Robustly upload a buffer to Discord with retry on 429 or 5xx
 */
const uploadBuffer = async (buffer, filename, retryCount = 0) => {
    const maxRetries = 3;
    if (!BOT_TOKEN || !CHANNEL_ID) {
        throw new Error("Missing Discord Configuration");
    }

    await checkCooldown();

    try {
        const formData = new FormData();
        const blob = new Blob([buffer]);
        formData.append("files[0]", blob, filename);

        const response = await axios.post(
            `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bot ${BOT_TOKEN}`
                },
            }
        );

        if (response.status === 200 || response.status === 201) {
            const msg = response.data;
            if (msg && msg.attachments && msg.attachments.length > 0) {
                return {
                    id: msg.id,
                    url: msg.attachments[0].url,
                };
            }
        }
        throw new Error(`Discord Upload Failed: ${response.status}`);
    } catch (err) {
        const isRateLimit = err.response?.status === 429;
        if (isRateLimit) {
            const retryAfter = (err.response.data?.retry_after || 1) * 1000;
            globalCooldownUntil = Date.now() + retryAfter; // Set global cooldown
        }

        if ((isRateLimit || err.response?.status >= 500) && retryCount < maxRetries) {
            const retryAfter = isRateLimit ? (err.response.data?.retry_after || 1) * 1000 : 2000 * (retryCount + 1);
            logger.warn(`[Discord] Upload error ${err.response?.status}. Retrying after ${retryAfter}ms`);
            await new Promise(r => setTimeout(r, retryAfter + 100));
            return uploadBuffer(buffer, filename, retryCount + 1);
        }
        throw err;
    }
};

/**
 * Robustly delete multiple messages from Discord in batches
 */
const bulkDeleteMessages = async (messageIds) => {
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;

    logger.log(`[Discord] Bulk deleting ${messageIds.length} messages...`);
    const batchSize = 3;

    for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => deleteMessage(id)));

        if (i + batchSize < messageIds.length) {
            await new Promise(r => setTimeout(r, 600)); // Rate limit buffer
        }
    }
};

module.exports = {
    deleteMessage,
    uploadBuffer,
    bulkDeleteMessages
};
