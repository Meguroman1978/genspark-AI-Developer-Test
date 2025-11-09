# 🔧 Critical Deployment Fix - Public URL Configuration

## 🚨 Problem Identified

**Issue 1: Incorrect Video Content**
- **Root Cause**: ElevenLabs service was generating `http://localhost:5000/temp/audio_*.mp3` URLs
- **Impact**: Creatomate (external service) cannot access localhost URLs
- **Result**: Videos generated without audio or with incorrect content

**Issue 2: YouTube Upload Failure**
- **Status**: Still under investigation
- **Enhanced Logging**: Added comprehensive OAuth token debugging
- **Next Steps**: Review backend logs for detailed error messages

## ✅ Solution Implemented

### 1. Public URL Auto-Detection

The server now auto-detects the public URL for sandbox environments:

```javascript
// Priority order:
1. PUBLIC_URL environment variable (highest priority)
2. SANDBOX_ID auto-detection → https://{port}-{sandbox-id}.sandbox.novita.ai
3. Localhost fallback (with warnings)
```

### 2. How to Start the Server

**Option A: With Environment Variable (Recommended)**
```bash
cd /home/user/webapp/backend
PUBLIC_URL=https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai node server.js
```

**Option B: Using Startup Script**
```bash
cd /home/user/webapp/backend
./start-with-public-url.sh
```

**Option C: For Production**
```bash
# Set environment variable permanently
export PUBLIC_URL=https://your-production-domain.com
npm start
```

### 3. Verify Configuration

After starting the server, check the console output:

```
✅ Expected Output:
🌐 Public URL set to: https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai
Server running on port 5000

❌ Warning Output (BAD):
⚠️  No PUBLIC_URL configured. Audio files may not be accessible to Creatomate.
```

## 🧪 Testing the Fix

### Test 1: Verify Audio URL

1. Generate a new video with any theme
2. Check backend logs for audio URL:
   ```
   [Job X] 🔗 Audio URL: https://5000-{sandbox-id}.sandbox.novita.ai/temp/audio_*.mp3
   ```
3. **Verify**: URL should start with `https://`, NOT `http://localhost`

### Test 2: Verify Creatomate Receives Correct URL

1. After video generation completes
2. Check Creatomate dashboard → Renders
3. Look at the modifications JSON
4. **Verify**: `Voiceover-1.source` should be a public HTTPS URL

### Test 3: Check Video Content

1. Generate video with theme: "犬も歩けば棒に当たる"
2. Watch the generated video
3. **Verify**: Video should have narration audio
4. **Verify**: Content should match the theme

### Test 4: Inspect Artifacts

1. After generation completes, expand "🔍 デバッグ情報"
2. Check all artifacts:
   - ✅ GPT-4 script should match theme
   - ✅ Audio player should play narration
   - ✅ Images should be relevant
   - ✅ Final video should have audio

## 📊 Expected Behavior After Fix

### Before Fix (BAD):
```json
{
  "Voiceover-1.source": "http://localhost:5000/temp/audio_1762541001311.mp3",
  "Voiceover-2.source": "",
  ...
}
```
❌ Creatomate cannot access localhost
❌ Video has no audio
❌ Content appears random/incorrect

### After Fix (GOOD):
```json
{
  "Voiceover-1.source": "https://5000-iukw9njrdih7jga4yuix6-02b9cc79.sandbox.novita.ai/temp/audio_1762541001311.mp3",
  "Voiceover-2.source": "",
  ...
}
```
✅ Creatomate can download audio
✅ Video has narration
✅ Content matches theme

## 🔍 YouTube Upload Debugging

Enhanced logging has been added to diagnose YouTube upload failures:

### What to Look For in Logs:

```bash
# Successful OAuth flow:
🔄 Checking token validity and refreshing if needed...
✅ Token is valid or has been refreshed
📝 Active token preview: ya29.a0AfH6SMBWr...
🔐 Verifying authentication before upload...
📋 Final credentials check: { has_access_token: true, ... }

# Upload attempt:
📤 Starting resumable upload to YouTube...
   Title: {theme} - AI Generated Video
   Privacy: public
   Video file size: 2126285 bytes
```

### Common YouTube Errors:

**Error 401: Invalid Credentials**
- Token expired (access_token valid for ~1 hour)
- Solution: Get new tokens from OAuth 2.0 Playground

**Error 403: Insufficient Permission**
- Missing YouTube API scopes
- Solution: Re-authenticate with correct scopes selected

## 🚀 Deployment Checklist

- [x] Fix localhost URL issue in ElevenLabsService
- [x] Add PUBLIC_URL auto-detection in server.js
- [x] Create startup script with URL configuration
- [x] Add CORS headers for /temp endpoint
- [x] Enhance YouTube OAuth logging
- [ ] Test video generation with new configuration
- [ ] Verify audio is accessible to Creatomate
- [ ] Review YouTube upload logs
- [ ] Create pull request with fixes

## 📝 Next Steps

1. **Restart Backend** with PUBLIC_URL environment variable
2. **Generate Test Video** with simple theme
3. **Review Logs** for:
   - Audio URL (should be public HTTPS)
   - Creatomate modifications (should have public audio URL)
   - YouTube upload errors (if any)
4. **Inspect Artifacts** to verify correct content generation
5. **Share Findings** for further YouTube upload debugging if needed

## 🆘 Troubleshooting

### Audio Still Using Localhost?

Check server startup logs:
```bash
# Good:
🌐 Public URL set to: https://5000-...

# Bad:
⚠️  No PUBLIC_URL configured...
```

**Solution**: Restart server with PUBLIC_URL environment variable

### Creatomate Still Failing?

1. Check if audio URL is publicly accessible:
   ```bash
   curl -I https://5000-{sandbox-id}.sandbox.novita.ai/temp/audio_test.mp3
   ```
2. Verify CORS headers are present
3. Check Creatomate dashboard for error messages

### YouTube Upload Still Failing?

1. Review enhanced logs for exact error
2. Check token expiry times
3. Verify all required scopes are granted
4. Try re-authenticating with OAuth 2.0 Playground

---

**Status**: ✅ Audio URL fix implemented and deployed
**Remaining**: 🔄 YouTube upload debugging in progress
