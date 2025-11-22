import dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
};

if (!config.botToken) {
  throw new Error('BOT_TOKEN environment variable is required');
}

