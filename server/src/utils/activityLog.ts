/**
 * activityLog — prints a timestamped user-activity line to stdout.
 *
 * Format:  [YYYY-MM-DD HH:MM:SS] [ACTIVITY] <username | email | uid>  action
 *
 * Because the server's stdout is captured by start_termux.sh into server.log
 * AND echoed to the tmux pane, these lines will appear live in the terminal.
 */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function timestamp(): string {
    const d = new Date();
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
}

/**
 * @param actor  Display name, email, or UID of the user performing the action.
 * @param action Human-readable description, e.g. "logged in", "added expense ₹500 (Food)".
 */
export function activityLog(actor: string, action: string): void {
    console.log(`[${timestamp()}] [ACTIVITY] ${actor}  ${action}`);
}

/**
 * Resolve the best human-readable label for a user from what we have.
 * Prefers username → email → uid (truncated).
 */
export function actorLabel(opts: {
    username?: string | null;
    email?: string | null;
    uid?: string | null;
}): string {
    if (opts.username) return opts.username;
    if (opts.email)    return opts.email;
    if (opts.uid)      return opts.uid.slice(0, 8) + '…';
    return 'unknown';
}
