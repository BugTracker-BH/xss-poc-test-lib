const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'bot.db');

let db;

function initDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS xp (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      last_xp_at INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT,
      status TEXT DEFAULT 'open',
      created_at INTEGER DEFAULT (unixepoch()),
      closed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners INTEGER DEFAULT 1,
      ends_at INTEGER NOT NULL,
      ended INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
    );

    CREATE TABLE IF NOT EXISTS setup_state (
      guild_id TEXT PRIMARY KEY,
      completed INTEGER DEFAULT 0,
      setup_at INTEGER
    );
  `);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function getXp(userId, guildId) {
  const row = getDb().prepare('SELECT * FROM xp WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return row || { user_id: userId, guild_id: guildId, xp: 0, level: 0, total_messages: 0, last_xp_at: 0 };
}

function addXp(userId, guildId, amount) {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO xp (user_id, guild_id, xp, total_messages, last_xp_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(user_id, guild_id)
    DO UPDATE SET xp = xp + ?, total_messages = total_messages + 1, last_xp_at = ?
  `).run(userId, guildId, amount, now, amount, now);
  return getXp(userId, guildId);
}

function setLevel(userId, guildId, level) {
  getDb().prepare('UPDATE xp SET level = ? WHERE user_id = ? AND guild_id = ?').run(level, userId, guildId);
}

function getLeaderboard(guildId, limit = 10) {
  return getDb().prepare('SELECT * FROM xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
}

function xpForLevel(level) {
  return 5 * (level * level) + 50 * level + 100;
}

function createTicket(guildId, channelId, userId, type, subject) {
  const info = getDb().prepare(
    'INSERT INTO tickets (guild_id, channel_id, user_id, type, subject) VALUES (?, ?, ?, ?, ?)'
  ).run(guildId, channelId, userId, type, subject);
  return info.lastInsertRowid;
}

function closeTicket(ticketId) {
  getDb().prepare('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?')
    .run('closed', Math.floor(Date.now() / 1000), ticketId);
}

function getTicketByChannel(channelId) {
  return getDb().prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function createGiveaway(guildId, channelId, messageId, hostId, prize, winners, endsAt) {
  const info = getDb().prepare(
    'INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, winners, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(guildId, channelId, messageId, hostId, prize, winners, endsAt);
  return info.lastInsertRowid;
}

function enterGiveaway(giveawayId, userId) {
  try {
    getDb().prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)').run(giveawayId, userId);
    return true;
  } catch {
    return false;
  }
}

function getGiveawayByMessage(messageId) {
  return getDb().prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
}

function getGiveawayEntries(giveawayId) {
  return getDb().prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?').all(giveawayId);
}

function endGiveaway(giveawayId) {
  getDb().prepare('UPDATE giveaways SET ended = 1 WHERE id = ?').run(giveawayId);
}

function getActiveGiveaways() {
  return getDb().prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?').all(Math.floor(Date.now() / 1000));
}

function markSetupComplete(guildId) {
  getDb().prepare(
    'INSERT INTO setup_state (guild_id, completed, setup_at) VALUES (?, 1, ?) ON CONFLICT(guild_id) DO UPDATE SET completed = 1, setup_at = ?'
  ).run(guildId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));
}

function isSetupComplete(guildId) {
  const row = getDb().prepare('SELECT completed FROM setup_state WHERE guild_id = ?').get(guildId);
  return row?.completed === 1;
}

module.exports = {
  initDatabase, getDb,
  getXp, addXp, setLevel, getLeaderboard, xpForLevel,
  createTicket, closeTicket, getTicketByChannel,
  createGiveaway, enterGiveaway, getGiveawayByMessage, getGiveawayEntries, endGiveaway, getActiveGiveaways,
  markSetupComplete, isSetupComplete,
};
