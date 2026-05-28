# Expense Tracker on Termux

## Start the app

```bash
cd ~/Expense_Tracker
git pull
bash start_termux.sh
```

Open the URL Vite prints (often `http://127.0.0.1:5173`).

Local API only (no tunnel):

```bash
SKIP_NGROK=1 bash start_termux.sh
```

---

## ngrok on Termux (same public URL every time)

The Linux `ngrok` binary **does not run** on **Google Play** Termux (`unexpected e_type: 2`). Use **Termux from F-Droid**.

### One-time setup

1. Uninstall Termux from Google Play (if installed).
2. Install [Termux from F-Droid](https://f-droid.org/en/packages/com.termux/).
3. In Termux:

```bash
termux-setup-storage
pkg update && pkg upgrade -y
cd ~/Expense_Tracker
rm -f ngrok/ngrok
git pull
./ngrok/ngrok version   # after first start_termux.sh download, or run script once
```

If `ngrok version` works, start normally:

```bash
bash start_termux.sh
```

4. For remote access from another device, set the client API URL before start:

```bash
export VITE_API_URL=https://elke-nonstrategic-shad.ngrok-free.dev/api
bash start_termux.sh
```

Check tunnel status: `http://127.0.0.1:4040`

### If ngrok still fails

- Confirm F-Droid Termux (not Play Store).
- Remove broken binary: `rm -f ngrok/ngrok` and run `bash start_termux.sh` again.
- Run tunnel on PC with `start_all.bat` while the phone serves the API on LAN.

---

## Database errors (`no such table: user_..._friends`)

After pulling the latest server fix, restart the app:

```bash
pkill -f "tsx watch"
pkill -f vite
bash start_termux.sh
```

In the app, open **Profile / register** once so `/api/auth/register` runs and creates your tables.

If errors persist, back up then reset (you will lose local DB data):

```bash
cp /sdcard/Documents/ExpenseTracker/expense_tracker.db ~/expense_tracker.db.bak
rm -f /sdcard/Documents/ExpenseTracker/expense_tracker.db
bash start_termux.sh
```

Then sign in and register again.
