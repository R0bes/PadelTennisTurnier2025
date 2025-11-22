import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ADMINS_FILE = join(process.cwd(), 'admins.json');

// Default admin IDs from environment
const getDefaultAdmins = (): number[] => {
  const envAdmins = process.env.ADMIN_IDS;
  if (envAdmins) {
    return envAdmins.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
  }
  return [];
};

// Load admins from file or create with defaults
export async function loadAdmins(): Promise<number[]> {
  try {
    const data = await readFile(ADMINS_FILE, 'utf-8');
    const admins = JSON.parse(data);
    if (Array.isArray(admins)) {
      return admins;
    }
  } catch (error) {
    // File doesn't exist or is invalid, create with defaults
    const defaultAdmins = getDefaultAdmins();
    if (defaultAdmins.length > 0) {
      await saveAdmins(defaultAdmins);
      return defaultAdmins;
    }
  }
  return getDefaultAdmins();
}

// Save admins to file
export async function saveAdmins(admins: number[]): Promise<void> {
  await writeFile(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf-8');
}

// Check if user is admin
export async function isAdmin(userId: number | undefined): Promise<boolean> {
  if (!userId) return false;
  const admins = await loadAdmins();
  return admins.includes(userId);
}

// Add admin
export async function addAdmin(userId: number): Promise<boolean> {
  const admins = await loadAdmins();
  if (admins.includes(userId)) {
    return false; // Already admin
  }
  admins.push(userId);
  await saveAdmins(admins);
  return true;
}

// Remove admin
export async function removeAdmin(userId: number): Promise<boolean> {
  const admins = await loadAdmins();
  const index = admins.indexOf(userId);
  if (index === -1) {
    return false; // Not an admin
  }
  admins.splice(index, 1);
  await saveAdmins(admins);
  return true;
}

// List all admins
export async function listAdmins(): Promise<number[]> {
  return await loadAdmins();
}

