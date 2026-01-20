# 🕵️ Privacy-Focused Content Aggregation Guide

## 🚨 **IMPORTANT DISCLAIMER**

This system is designed for **educational and research purposes only**. Users are responsible for:
- Complying with all applicable laws and regulations
- Respecting website terms of service
- Obtaining proper permissions when required
- Using the system ethically and responsibly

## 🔒 **Privacy Features Overview**

### **Anti-Detection Techniques**
- **Session Rotation**: Automatically rotates between multiple HTTP sessions
- **User Agent Rotation**: Uses realistic browser user agents
- **Header Randomization**: Varies HTTP headers to appear more human-like
- **Timing Randomization**: Adds random delays and jitter between requests
- **Referer Randomization**: Occasionally adds realistic referer headers

### **Request Patterns**
- **Respectful Delays**: 3-8 seconds between requests (configurable)
- **Session Limits**: Rotates after 50 requests or 30 minutes
- **Error Handling**: Automatically handles rate limiting and blocking
- **Graceful Degradation**: Continues operation even if some sources fail

## 🛠️ **Installation & Setup**

### **1. Install Dependencies**
```bash
npm install https-proxy-agent socks-proxy-agent
```

### **2. Environment Configuration**
```bash
# .env file
PRIVACY_LEVEL=default          # default, stealth, or conservative
CURSEFORGE_API_KEY=your_key    # Optional: For CurseForge API access
```

### **3. Privacy Levels**

#### **Default Level** (Recommended for most users)
- 3-8 second delays between requests
- Session rotation every 50 requests
- Basic anti-detection features

#### **Stealth Level** (Enhanced privacy)
- 5-15 second delays between requests
- Session rotation every 25 requests
- Advanced anti-detection features

#### **Conservative Level** (Maximum privacy)
- 10-30 second delays between requests
- Session rotation every 20 requests
- All privacy features enabled

## 🚀 **Usage**

### **Basic Usage**
```bash
# Run with default privacy settings
npm run content:privacy

# Run with stealth privacy settings
npm run content:stealth

# Run with conservative privacy settings
npm run content:conservative
```

### **Manual Execution**
```bash
# Direct execution
npx tsx scripts/run-privacy-aggregation.ts

# With custom privacy level
PRIVACY_LEVEL=stealth npx tsx scripts/run-privacy-aggregation.ts
```

## 🌐 **Supported Sources**

### **1. Patreon**
- **URLs**: Multiple creator pages
- **Content**: Mod announcements, downloads, descriptions
- **Privacy**: High - mimics normal browsing patterns

### **2. CurseForge**
- **API**: Official API with authentication
- **Content**: Mod metadata, downloads, categories
- **Privacy**: High - uses official API

### **3. Tumblr**
- **Tags**: sims4cc, sims4mods, sims4customcontent
- **Content**: Mod showcases, downloads, descriptions
- **Privacy**: High - mimics normal browsing

### **4. Sims Resource**
- **URL**: thesimsresource.com
- **Content**: Mod downloads, categories, descriptions
- **Privacy**: High - realistic browsing patterns

### **5. ModTheSims**
- **URL**: modthesims.info
- **Content**: Community mods, downloads, descriptions
- **Privacy**: High - mimics normal browsing

## 🔧 **Configuration**

### **Custom Privacy Settings**
```typescript
// lib/config/privacy.ts
export const customPrivacyConfig: PrivacyConfig = {
  minDelay: 5000,           // 5 seconds minimum
  maxDelay: 12000,          // 12 seconds maximum
  jitterRange: 3000,        // 3 seconds jitter
  maxRequestsPerSession: 30, // Rotate after 30 requests
  sessionTimeout: 20 * 60 * 1000, // 20 minutes
  // ... other settings
};
```

### **Environment Variables**
```bash
# Set privacy level
export PRIVACY_LEVEL=stealth

# Custom delays (in milliseconds)
export MIN_DELAY=5000
export MAX_DELAY=15000

# Session settings
export MAX_REQUESTS_PER_SESSION=25
export SESSION_TIMEOUT=900000
```

## 🛡️ **Best Practices**

### **1. Respect Rate Limits**
- Don't run multiple instances simultaneously
- Use appropriate privacy levels for your needs
- Monitor for rate limiting responses

### **2. Monitor for Blocking**
- Watch for 403/429 HTTP responses
- Check if content is still accessible
- Adjust privacy settings if needed

### **3. Ethical Considerations**
- Only scrape publicly available content
- Respect robots.txt files
- Don't overwhelm target servers
- Credit original creators

### **4. Legal Compliance**
- Review website terms of service
- Understand local laws and regulations
- Obtain permissions when required
- Implement takedown procedures

## 📊 **Monitoring & Logging**

### **Console Output**
```
🚀 Starting MustHaveMods Privacy-Focused Content Aggregation
============================================================
📋 Privacy Configuration:
   - Min Delay: 3000ms
   - Max Delay: 8000ms
   - Jitter Range: 2000ms
   - Max Requests per Session: 50
   - Session Timeout: 30 minutes
   - Random Referers: Enabled
   - User Agent Rotation: Enabled
   - Header Randomization: Enabled

🔒 Privacy Level: DEFAULT
🌐 Starting content aggregation...
```

### **Session Rotation Logs**
```
Rotated to session 2
Rotated to session 3
Rotated to session 1
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Rate Limiting (429)**
- Increase delays between requests
- Use higher privacy level
- Check for multiple instances running

#### **Access Denied (403)**
- Site may have detected automation
- Increase privacy level
- Wait before retrying

#### **Connection Timeouts**
- Check internet connection
- Verify target site accessibility
- Adjust timeout settings

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=privacy-aggregator npm run content:privacy
```

## 🔮 **Advanced Features**

### **Proxy Support** (Future)
```typescript
// Configure proxy rotation
const proxyConfig: ProxyConfig = {
  host: 'proxy.example.com',
  port: 8080,
  protocol: 'http',
  username: 'user',
  password: 'pass'
};
```

### **Geographic Rotation** (Future)
- Rotate between different geographic locations
- Use CDN endpoints in different regions
- Mimic global user distribution

### **Machine Learning Detection** (Future)
- Analyze response patterns for detection
- Automatically adjust privacy settings
- Learn from successful vs. failed requests

## 📚 **Additional Resources**

### **Legal Resources**
- [Web Scraping Legal Guide](https://example.com)
- [Terms of Service Analysis](https://example.com)
- [DMCA Compliance Guide](https://example.com)

### **Technical Resources**
- [HTTP Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [User Agent Strings](https://developers.whatismybrowser.com/useragents/)
- [Rate Limiting Best Practices](https://example.com)

### **Community Resources**
- [Sims 4 Modding Community](https://example.com)
- [Content Creator Guidelines](https://example.com)
- [Ethical Scraping Discussion](https://example.com)

## 🧹 **Data Quality & Cleanup**

### **Author Data Cleanup**

The scraper may occasionally extract incorrect author information. A cleanup script is available to fix these issues.

#### **Common Issues**
- URL path segments extracted as authors (e.g., "Title", "ShRef", "Id")
- Patreon post IDs instead of creator names
- Domain parts used as fallback (e.g., "Www", "Blogspot")

#### **Running the Cleanup Script**

```bash
# Dry run - preview changes without modifying database
npx tsx scripts/cleanup-author-data.ts

# Fix first 100 mods (recommended for testing)
npx tsx scripts/cleanup-author-data.ts --fix --limit=100

# Fix all mods with bad authors
npx tsx scripts/cleanup-author-data.ts --fix
```

#### **What the Script Does**
1. Identifies mods with garbage/missing author data
2. Visits actual download URLs (Patreon, TSR, Tumblr, etc.)
3. Extracts real author names from page metadata
4. Updates the database with correct information

#### **Platform-Specific Notes**
| Platform | Extraction Method | Reliability |
|----------|-------------------|-------------|
| Tumblr | Subdomain/path | High |
| TSR | URL pattern (`/artists/`, `/staff/`) | High |
| Patreon | Meta tags | Medium |
| CurseForge | Wayback Machine fallback | Medium |
| ModTheSims | Wayback Machine fallback | Medium |
| SimsFinds | No metadata available | Low |

For detailed documentation, see: `docs/PRD-author-data-cleanup.md`

### **Preventing Future Issues**

The scraper has been updated to:
- Validate extracted authors against known bad patterns
- Return `undefined` for ambiguous URLs (triggering page scraping)
- Use platform-specific extraction methods

New content scraped will have more accurate author information.

---

## 🤝 **Support & Contributing**

### **Getting Help**
- Check the troubleshooting section
- Review console logs for errors
- Adjust privacy settings as needed
- Consider using a higher privacy level

### **Contributing**
- Report bugs and issues
- Suggest new privacy features
- Improve anti-detection techniques
- Add support for new content sources

---

**Remember**: This system is designed to be respectful and ethical. Always prioritize the rights of content creators and the stability of target websites.
