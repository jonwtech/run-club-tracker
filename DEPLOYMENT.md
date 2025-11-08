# Deployment Guide for Run Club Tracker Website

This guide will walk you through deploying the Run Club Tracker as a static website.

## Prerequisites

- A Strava account
- A GitHub account (for GitHub Pages) or AWS account (for S3)

## Step 1: Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application with the following settings:
   - **Application Name**: Run Club Tracker (or your preferred name)
   - **Category**: Health & Fitness
   - **Club**: Leave blank (unless you want to associate it with a specific club)
   - **Website**: Your website URL (e.g., `https://yourusername.github.io/run-club-tracker`)
   - **Authorization Callback Domain**: The domain where your site will be hosted
     - For GitHub Pages: `yourusername.github.io`
     - For S3/CloudFront: your domain name
     - For local testing: `localhost` or `127.0.0.1`

3. After creation, note your **Client ID** - you'll need this in the next step

## Step 2: Configure the Application

1. Open `app.js` in a text editor
2. Find the `STRAVA_CONFIG` object near the top of the file
3. Replace `YOUR_STRAVA_CLIENT_ID` with your actual Client ID from Strava:

```javascript
const STRAVA_CONFIG = {
    clientId: '12345', // Replace with your actual Client ID
    redirectUri: window.location.origin + window.location.pathname,
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    scope: 'activity:read'
};
```

**Important Notes:**
- You do NOT need a Client Secret for this implementation (PKCE flow doesn't require it)
- The `redirectUri` is automatically set based on where the site is hosted
- Never commit your Client Secret to version control (we're not using it here)

## Step 3: Deploy to Your Hosting Platform

### Option A: GitHub Pages

1. **Create a GitHub repository** (if you haven't already):
   ```bash
   git init
   git add index.html style.css app.js DEPLOYMENT.md
   git commit -m "Add static website files"
   git branch -M main
   git remote add origin https://github.com/yourusername/run-club-tracker.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "main" branch
   - Click "Save"
   - Your site will be available at `https://yourusername.github.io/run-club-tracker`

3. **Update Strava Authorization Callback Domain**:
   - Go back to [Strava API Settings](https://www.strava.com/settings/api)
   - Edit your application
   - Set Authorization Callback Domain to: `yourusername.github.io`
   - Save changes

### Option B: AWS S3 + CloudFront

1. **Create an S3 bucket**:
   ```bash
   aws s3 mb s3://run-club-tracker
   ```

2. **Configure bucket for static website hosting**:
   ```bash
   aws s3 website s3://run-club-tracker --index-document index.html --error-document index.html
   ```

3. **Upload files**:
   ```bash
   aws s3 sync . s3://run-club-tracker --exclude ".git/*" --exclude "*.py" --exclude "*.md" --exclude "requirements.txt"
   ```

4. **Set bucket policy for public read**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::run-club-tracker/*"
       }
     ]
   }
   ```

5. **(Optional) Set up CloudFront** for HTTPS and better performance:
   - Create a CloudFront distribution pointing to your S3 bucket
   - Configure custom domain if desired
   - Update Strava Authorization Callback Domain with your CloudFront domain

### Option C: Local Testing

For local development and testing:

1. **Update Strava app settings**:
   - Authorization Callback Domain: `localhost` or `127.0.0.1`

2. **Serve locally using Python**:
   ```bash
   python3 -m http.server 8000
   ```

3. **Or use Node.js http-server**:
   ```bash
   npx http-server -p 8000
   ```

4. **Access at**: `http://localhost:8000`

**Note**: OAuth will only work if `localhost` or `127.0.0.1` is configured in Strava's Authorization Callback Domain.

## Step 4: Using the Application

1. **Navigate to your deployed website**
2. **Click "Connect with Strava"** - you'll be redirected to Strava to authorize the app
3. **After authorization**, you'll return to the site
4. **Enter your run club coordinates**:
   - You can find coordinates using Google Maps (right-click → "What's here?")
   - Set an appropriate search radius (default is 0.5 km)
5. **Click "Analyze Activities"** to see your stats

## Troubleshooting

### "Invalid redirect_uri" error
- Make sure your Authorization Callback Domain in Strava matches your hosting domain exactly
- Don't include `http://` or `https://` in the callback domain setting on Strava
- Don't include paths (e.g., use `example.com`, not `example.com/tracker`)

### "Please configure your Strava Client ID" error
- You haven't updated the Client ID in `app.js`
- Make sure you replaced `YOUR_STRAVA_CLIENT_ID` with your actual numeric Client ID

### Authentication fails silently
- Check browser console for errors
- Verify that `activity:read` scope is requested
- Make sure your access token hasn't expired (tokens are valid for 6 hours)

### No activities found
- Verify your coordinates are correct
- Try increasing the search radius
- Make sure you have runs on Tuesdays between 18:45-19:15
- Check that the runs start near the specified location

## Security Notes

1. **Client ID is public**: It's safe to include your Client ID in the JavaScript - it's meant to be public
2. **No Client Secret needed**: This implementation uses PKCE (Proof Key for Code Exchange), which is secure for browser-based apps
3. **Access tokens**: Stored in sessionStorage (cleared when browser closes) - never in localStorage or cookies
4. **HTTPS recommended**: Always use HTTPS in production (GitHub Pages and CloudFront provide this automatically)

## Updating the Site

When you make changes:

**GitHub Pages**:
```bash
git add .
git commit -m "Update website"
git push
```

**S3**:
```bash
aws s3 sync . s3://run-club-tracker --exclude ".git/*" --exclude "*.py" --exclude "*.md" --exclude "requirements.txt"
```

## Customization

### Change Run Club Criteria

The filtering criteria are in `app.js` in the `isRunClubActivity` function:

```javascript
// Check if Tuesday (getDay() returns 2 for Tuesday)
if (dt.getDay() !== 2) {
    return false;
}

// Check if between 18:45 and 19:15
const minTime = 18 * 60 + 45; // 18:45
const maxTime = 19 * 60 + 15; // 19:15
```

Modify these values to match your run club's schedule.

### Styling

All styles are in `style.css`. The color scheme uses CSS custom properties (variables) defined in the `:root` selector for easy customization:

```css
:root {
    --primary-color: #fc4c02;  /* Strava orange */
    --secondary-color: #2d3748;
    /* ... other colors ... */
}
```

## Support

For issues related to:
- **Strava API**: Check [Strava API Documentation](https://developers.strava.com/)
- **This project**: Open an issue on GitHub

## License

This project is open source and available under the MIT License.
