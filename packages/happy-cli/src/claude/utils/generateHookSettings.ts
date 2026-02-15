/**
 * Generate temporary settings file with Claude hooks for session tracking
 * 
 * Creates a settings.json file that configures Claude's SessionStart hook
 * to notify our HTTP server when sessions change (new session, resume, compact, etc.)
 */

import { join, resolve } from 'node:path';
import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { configuration } from '@/configuration';
import { logger } from '@/ui/logger';
import { projectPath } from '@/projectPath';

/**
 * Generate a temporary settings file with SessionStart hook configuration
 * 
 * @param port - The port where Happy server is listening
 * @returns Path to the generated settings file
 */
export function generateHookSettingsFile(port: number): string {
    const hooksDir = join(configuration.happyHomeDir, 'tmp', 'hooks');
    mkdirSync(hooksDir, { recursive: true });

    // Unique filename per process to avoid conflicts
    const filename = `session-hook-${process.pid}.json`;
    const filepath = join(hooksDir, filename);

    // Path to the hook forwarder script
    const forwarderScript = resolve(projectPath(), 'scripts', 'session_hook_forwarder.cjs');
    const hookCommand = `node "${forwarderScript}" ${port}`;

    let userSettings = {};
    const userSettingsPath = join(homedir(), '.claude', 'settings.json');
    
    try {
        if (existsSync(userSettingsPath)) {
            userSettings = JSON.parse(readFileSync(userSettingsPath, 'utf8'));
            logger.debug(`[generateHookSettings] Loaded user settings from: ${userSettingsPath}`);
        }
    } catch (error) {
        logger.debug(`[generateHookSettings] Failed to load user settings: ${error}`);
    }

    const hookConfig = {
        matcher: "*",
        hooks: [
            {
                type: "command",
                command: hookCommand
            }
        ]
    };

    // Merge hook config into user settings
    const settings = {
        ...userSettings,
        hooks: {
            ...(userSettings as any).hooks,
            SessionStart: [
                ...((userSettings as any).hooks?.SessionStart || []),
                hookConfig
            ]
        }
    };

    writeFileSync(filepath, JSON.stringify(settings, null, 2));
    logger.debug(`[generateHookSettings] Created hook settings file: ${filepath}`);

    return filepath;
}

/**
 * Clean up the temporary hook settings file
 * 
 * @param filepath - Path to the settings file to remove
 */
export function cleanupHookSettingsFile(filepath: string): void {
    try {
        if (existsSync(filepath)) {
            unlinkSync(filepath);
            logger.debug(`[generateHookSettings] Cleaned up hook settings file: ${filepath}`);
        }
    } catch (error) {
        logger.debug(`[generateHookSettings] Failed to cleanup hook settings file: ${error}`);
    }
}

