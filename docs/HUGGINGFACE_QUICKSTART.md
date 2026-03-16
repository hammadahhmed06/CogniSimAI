# 🚀 Quick Start - Deploy to Hugging Face Spaces

**Get your backend running in 10 minutes!**

---

## ⚡ Super Fast Setup

### 1. Create Hugging Face Account
- Go to [huggingface.co/join](https://huggingface.co/join)
- Sign up (NO credit card needed!)
- Verify email

### 2. Create New Space
- Go to [huggingface.co/new-space](https://huggingface.co/new-space)
- Name: `cognisim-backend`
- SDK: **Docker** 🐳
- Hardware: **CPU basic (free)**
- Click **Create Space**

### 3. Upload Files

**Option A: Via Web (Easiest)**
1. In your Space, click **Files** tab
2. Click **Add file** → **Upload files**
3. Upload these files from `cognisim_ai_backend/`:
   - `Dockerfile`
   - `README.md`
   - `requirements.txt`
   - `app/` folder (drag entire folder)
   - All other Python files
4. Click **Commit**

**Option B: Via Git**
```powershell
cd C:\Users\Aftab\OneDrive\Desktop\Fyp\cognisim_ai_backend

# Get your HF token from: https://huggingface.co/settings/tokens
# Create token with WRITE access

# Add HF remote (replace USERNAME)
git remote add hf https://huggingface.co/spaces/USERNAME/cognisim-backend

# Push
git push hf master:main
# Enter username and token when prompted
```

### 4. Set Secrets

In your Space → **Settings** → **Repository secrets**

Add these (click **New secret** for each):

**Required:**
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
JIRA_OAUTH_CLIENT_ID = your-client-id
JIRA_OAUTH_CLIENT_SECRET = your-client-secret
ENCRYPTION_KEY = [generate 32 random chars]
```

**Generate encryption key in PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 5. Wait for Build

- Watch **Logs** tab
- Status will change: Building → Running ✅
- Takes ~5-10 minutes

### 6. Get Your URL

Your backend is live at:
```
https://USERNAME-cognisim-backend.hf.space
```

Test it:
```
https://USERNAME-cognisim-backend.hf.space/health
https://USERNAME-cognisim-backend.hf.space/docs
```

### 7. Update Frontend

In Vercel dashboard:
- Settings → Environment Variables
- Edit `VITE_API_BASE_URL`:
  ```
  https://USERNAME-cognisim-backend.hf.space
  ```
- Redeploy

---

## ✅ Done!

Your backend is now:
- ✅ Running 24/7 (no cold starts)
- ✅ Free forever (no credit card)
- ✅ 16GB RAM, 8 vCPU
- ✅ Auto HTTPS
- ✅ Ready for production

---

## 🔄 Future Updates

Just push to GitHub:
```powershell
git add .
git commit -m "Update backend"
git push origin master
```

Then sync in HF Space Settings → "Factory reboot" or reconnect GitHub for auto-deploy.

---

## 📚 Full Documentation

See `HUGGINGFACE_DEPLOYMENT_GUIDE.md` for complete details.

---

**🎉 Congratulations! Your backend is live!**
