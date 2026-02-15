# Password reset email

Forgot-password emails are sent from **Bookshelf Helpdesk** (one address for all users). The reset link uses **FRONTEND_URL** or, when the user opens the app from a non-localhost URL, that URL so the link works when clicked.

## Send to all users (Gmail)

1. **Gmail App Password:** https://myaccount.google.com/security → 2-Step Verification → App passwords → Mail → Generate. Copy the 16-character password (no spaces).
2. **`server/.env`:**
   ```env
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-char-app-password
   EMAIL_FROM=your@gmail.com
   EMAIL_FROM_NAME=Bookshelf Helpdesk
   FRONTEND_URL=http://localhost:5173
   ```
3. **Restart:** `cd server && npm run dev`. You should see: *Email: Gmail SMTP verified…*

Then any user who uses Forgot password gets the reset link in their inbox. Check Spam if needed.

## Reset link – why it might not open

The link in the email goes to your **backend** (e.g. `http://localhost:3001/auth/reset-redirect?token=...`). The backend then redirects the browser to the **frontend** reset page. So when you click the link:

1. **Same computer:** Ensure the frontend is running (`npm run dev` in project root) and the backend is running (`cd server && npm run dev`). The link should open and redirect to the reset page.
2. **Opened the email on a different device (e.g. phone):** On that device, "localhost" is not your computer, so the link will not work. Set **FRONTEND_URL** and **BACKEND_URL** in `server/.env` to your computer’s IP, then request a new reset email:
   ```env
   FRONTEND_URL=http://192.168.1.10:5173
   BACKEND_URL=http://192.168.1.10:3001
   ```
   Replace `192.168.1.10` with your PC’s IP (on Mac: System Settings → Network; on Windows: `ipconfig`). Restart the server and use Forgot password again.
