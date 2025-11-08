# Configuration Guide

This guide explains how to configure the Run Club Tracker with your Strava Client ID.

## Understanding Client IDs

The Strava Client ID is **not a secret** - it's meant to be public and visible in browser code. However, keeping it separate from your code is still good practice for:
- Easier environment management (dev vs. production)
- Cleaner version control
- Simplified deployment workflows

## Option 1: Local Config File (Recommended for Development)

### Setup

1. **Copy the template**:
   ```bash
   cp config.template.js config.js
   ```

2. **Edit config.js** and add your Client ID:
   ```javascript
   window.APP_CONFIG = {
       STRAVA_CLIENT_ID: '12345' // Your actual Client ID
   };
   ```

3. **The file is gitignored** - it won't be committed to version control

4. **Test locally**:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

### How it works
- `index.html` loads `config.js` before `app.js`
- `app.js` reads the Client ID from `window.APP_CONFIG.STRAVA_CLIENT_ID`
- If `config.js` is missing, it falls back to the placeholder and shows an error

## Option 2: GitHub Actions with Repository Secrets (Recommended for Production)

### Setup

1. **Add your Client ID as a repository secret**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `STRAVA_CLIENT_ID`
   - Value: Your Strava Client ID
   - Click "Add secret"

2. **The workflow is already configured** (`.github/workflows/deploy.yml`):
   - Automatically creates `config.js` during deployment
   - Uses the secret from step 1
   - Deploys to GitHub Pages

3. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: "GitHub Actions" (not "Deploy from a branch")
   - Save

4. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Configure deployment"
   git push
   ```

5. **The workflow runs automatically**:
   - Check Actions tab to monitor progress
   - Site will be live at `https://yourusername.github.io/run-club-tracker`

### How it works
- GitHub Actions workflow runs on every push to main
- Workflow reads `STRAVA_CLIENT_ID` secret
- Creates `config.js` with the actual value
- Deploys the site with the generated config

## Option 3: AWS S3 with Build Script

If deploying to S3, you can use environment variables:

### Setup

1. **Create a deploy script** (`deploy.sh`):
   ```bash
   #!/bin/bash

   # Check if STRAVA_CLIENT_ID is set
   if [ -z "$STRAVA_CLIENT_ID" ]; then
       echo "Error: STRAVA_CLIENT_ID environment variable not set"
       exit 1
   fi

   # Create config.js
   cat > config.js << EOF
   window.APP_CONFIG = {
       STRAVA_CLIENT_ID: '$STRAVA_CLIENT_ID'
   };
   EOF

   # Deploy to S3
   aws s3 sync . s3://your-bucket-name \
       --exclude ".git/*" \
       --exclude "*.py" \
       --exclude "*.md" \
       --exclude "requirements.txt" \
       --exclude "deploy.sh"

   echo "Deployed successfully!"
   ```

2. **Make it executable**:
   ```bash
   chmod +x deploy.sh
   ```

3. **Deploy**:
   ```bash
   export STRAVA_CLIENT_ID="12345"
   ./deploy.sh
   ```

## Comparison

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| Local Config File | Development | Simple, fast iteration | Manual setup on each machine |
| GitHub Actions | GitHub Pages | Automated, secure | Requires GitHub hosting |
| Build Script | S3/Custom | Flexible, portable | Manual deployment step |

## Troubleshooting

### "Please configure your Strava Client ID" error

This means `config.js` is missing or doesn't contain a valid Client ID:

1. **For local development**: Check that `config.js` exists and has your Client ID
2. **For GitHub Pages**: Verify the `STRAVA_CLIENT_ID` secret is set in repository settings
3. **For S3**: Ensure the deploy script created `config.js` correctly

### Config file works locally but not in production

- GitHub Pages: Check the Actions workflow logs for errors
- S3: Verify `config.js` was uploaded with the correct content
- Check browser console for JavaScript errors

### Want to use multiple environments?

Create different config files:
- `config.dev.js` - for development
- `config.prod.js` - for production

Then update `index.html` to load the appropriate one based on the environment.

## Security Notes

1. **Client ID is public** - It's OK if people see it in browser developer tools
2. **Never commit Client Secret** - We don't use it (PKCE flow), but if you did, NEVER commit it
3. **Access tokens** - Stored only in `sessionStorage`, cleared when browser closes
4. **Use HTTPS in production** - GitHub Pages and S3/CloudFront provide this automatically
