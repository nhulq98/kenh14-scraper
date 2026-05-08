# 📊 Stats Configuration Guide

This guide explains how to set up the stats collection for Google, TikTok, and Facebook metrics in the trending people section.

## Current Status

Currently, the stats are **MOCK DATA** (randomly generated). To collect real data, you need to set up API integrations.

## Setup Instructions

### 1. Google Trends API (Search Volume)

**Option A: Using Google Trends API (Free but Limited)**
- Library: `google-trends-api` or custom scraping
- Installation: `npm install google-trends-api`
- Update: `services/stats.js` - `getGoogleStats()` function

```javascript
// Example implementation
const googleTrendsApi = require('google-trends-api');

async function getGoogleStats(personName) {
    try {
        const results = await googleTrendsApi.interestByRegion({
            keyword: personName,
            startTime: new Date(Date.now() - 48*60*60*1000), // Last 48h
            geo: 'VN'
        });
        return {
            searches: results.default[0].value || 0,
            trends: 1
        };
    } catch (err) {
        console.warn('Google Trends error:', err);
        return { searches: 0, trends: 0 };
    }
}
```

**Option B: Using Google Custom Search API (Paid)**
- Setup: https://developers.google.com/custom-search
- Cost: $5 per 1000 queries
- More accurate search volume

### 2. TikTok Stats (Views, Likes, Comments)

**Option A: Using TikTok API (Official)**
- Documentation: https://developer.tiktok.com/
- Requires: Business/Creator Account + API Keys
- Installation: `npm install tiktok-api-unofficial`

```javascript
// Example implementation
async function getTikTokStats(personName) {
    try {
        // Search for hashtag or account
        const response = await tiktok.search.hashtags(personName, {
            count: 1
        });
        
        if (!response.hashtags.length) return { views: 0, likes: 0, comments: 0 };
        
        const hashtag = response.hashtags[0];
        return {
            views: hashtag.stats.videoCount * 50000, // Estimate
            likes: hashtag.stats.videoCount * 5000,
            comments: hashtag.stats.videoCount * 500
        };
    } catch (err) {
        console.warn('TikTok API error:', err);
        return { views: 0, likes: 0, comments: 0 };
    }
}
```

**Setup Steps:**
1. Go to: https://developer.tiktok.com/
2. Create an application
3. Get `Client ID` and `Client Secret`
4. Add to `.env`:
   ```
   TIKTOK_CLIENT_ID=your_client_id
   TIKTOK_CLIENT_SECRET=your_client_secret
   ```

### 3. Facebook Stats (Engagement)

**Option A: Using Facebook Graph API**
- Documentation: https://developers.facebook.com/docs/graph-api
- Requires: Facebook App + Access Token

```javascript
// Example implementation
async function getFacebookStats(personName) {
    try {
        const accessToken = process.env.FB_ACCESS_TOKEN;
        
        // Search for public pages/posts mentioning the person
        const response = await fetch(
            `https://graph.facebook.com/search?` +
            `q=${encodeURIComponent(personName)}` +
            `&type=page` +
            `&fields=name,engagement.summary(total_count)` +
            `&access_token=${accessToken}`
        );
        
        const data = await response.json();
        
        if (!data.data.length) {
            return { views: 0, likes: 0, comments: 0 };
        }
        
        const page = data.data[0];
        return {
            views: page.engagement?.summary?.total_count * 100 || 0,
            likes: page.engagement?.summary?.total_count || 0,
            comments: Math.floor((page.engagement?.summary?.total_count || 0) * 0.1)
        };
    } catch (err) {
        console.warn('Facebook API error:', err);
        return { views: 0, likes: 0, comments: 0 };
    }
}
```

**Setup Steps:**
1. Go to: https://developers.facebook.com/
2. Create an app or use existing
3. Get Page Access Token: https://developers.facebook.com/tools/explorer/
4. Add to `.env`:
   ```
   FB_ACCESS_TOKEN=your_access_token
   ```

## Implementation Steps

1. **Install Required Packages:**
   ```bash
   npm install google-trends-api tiktok-api-unofficial
   ```

2. **Update `services/stats.js`:**
   - Uncomment and implement each function
   - Add API keys to `.env`
   - Test with `node -e "require('./services/stats').getPersonStats('Name')")`

3. **Test the Integration:**
   ```bash
   node test.js  # If you have a test file
   ```

4. **Add Error Handling:**
   - Each function has try-catch
   - Fallback to mock data on error
   - Log warnings for debugging

## Current Mock Implementation

The mock data generator in `services/stats.js` produces:

**Google:**
- `searches`: 10K - 100K random

**TikTok:**
- `views`: 100K - 10M random
- `likes`: 10K - 500K random
- `comments`: 1K - 50K random

**Facebook:**
- `views`: 50K - 1M random
- `likes`: 5K - 100K random
- `comments`: 500 - 10K random

## Rate Limiting & Caching

To avoid hitting API rate limits:

1. **Cache Results:**
   ```javascript
   // Update interval: 15 minutes (in server.js)
   setInterval(loadTrending, 15 * 60 * 1000);
   ```

2. **Batch Requests:**
   - `getPeopleStats()` uses Promise.all() for parallelization
   - Max 5 people per update cycle

3. **Fallback Strategy:**
   - If API fails, uses cached data
   - Shows "0" if no cache available
   - Logs warning for debugging

## Troubleshooting

**No stats showing:**
- Check `.env` for API keys
- Check console for errors
- Verify API rate limits not exceeded
- Try manual refresh button

**Incorrect data:**
- Verify search terms are correct
- Check if person name matches platform data
- Adjust search filters in implementation

**Performance issues:**
- Increase cache interval (currently 15 min)
- Implement Redis caching for production
- Use background jobs (Bull, RabbitMQ)

## Future Improvements

- [ ] Add Redis caching layer
- [ ] Implement background job queue
- [ ] Add data aggregation across platforms
- [ ] Create admin dashboard for stats
- [ ] Add A/B testing for stat display
- [ ] Historical data tracking

## Support

For issues with specific APIs:
- Google Trends: Check IP rate limits
- TikTok: Verify OAuth permissions
- Facebook: Check token expiration & app status
