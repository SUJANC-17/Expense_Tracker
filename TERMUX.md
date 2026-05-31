# Expense Tracker on Termux

## Start the app

```bash
cd ~/Expense_Tracker
git pull
bash start_termux.sh
```

The script starts the backend and frontend.

Run the Cloudflare tunnel in a second terminal:

```bash
bash start_cloudflare.sh
```

Use Termux from F-Droid. The Google Play build is not a good fit for this project.

### One-time setup

1. Install Termux from F-Droid.
2. Install `cloudflared` if needed.
3. Log in and create the named tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create expensetrack
cloudflared tunnel route dns expensetrack expensetrack.qzz.io
```

4. Create `~/.cloudflared/config.yml` with:

```yaml
tunnel: expensetrack
credentials-file: $HOME/.cloudflared/<UUID>.json

ingress:
  - hostname: expensetrack.qzz.io
    service: http://localhost:5173
  - service: http_status:404
```

## Stop behavior

- Press `Ctrl+C` in the `start_termux.sh` terminal to stop the backend and frontend only.
- Leave `start_cloudflare.sh` running if you want the Cloudflare domain to stay active.
- Press `Ctrl+C` in the tunnel terminal when you want to stop Cloudflare too.

## Database errors

If you see `no such table: user_..._friends`, restart the app after pulling the latest changes:

```bash
pkill -f "tsx watch"
pkill -f vite
bash start_termux.sh
```

Then open **Profile / register** once so `/api/auth/register` creates the user tables.

If you need to reset the local database:

```bash
cp /sdcard/Documents/ExpenseTracker/expense_tracker.db ~/expense_tracker.db.bak
rm -f /sdcard/Documents/ExpenseTracker/expense_tracker.db
bash start_termux.sh
```
