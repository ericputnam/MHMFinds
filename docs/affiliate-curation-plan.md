# Affiliate Product Curation Plan

## Goal
Get 10 qualifying Amazon sales within 30 days to unlock the Creators API.

## Current State
- **1,155 clicks** from manual links in content
- **18 sales** over 90 days (1.56% conversion rate)
- **Blocked from Creators API** - requires 10 sales in 30 days
- **Web scraping unreliable** - Amazon blocks category pages with CAPTCHAs

## Strategy: Theme-Based Manual Curation

Instead of automated product discovery, manually curate high-quality products that match our audience's aesthetics.

### Target: 25 Products Total
- 5 products per theme
- Top 5 themes by audience interest

### Top Themes (by mod count)
1. **Cozy** - 1,151 mods
2. **Modern** - 1,093 mods
3. **Minimalist** - 783 mods
4. **Luxury** - 776 mods
5. **Fantasy** - 552 mods

---

## Phase 1: Product Research & Validation

### Process for Each Theme
1. Research 8-10 product candidates on Amazon
2. Run each through 8-persona swarm validation
3. Keep only products with 4+/8 approval
4. Add top 5 to database

### Product Categories to Target
Based on audience demographics (women 16-30, creative/artistic):

| Category | Example Products |
|----------|------------------|
| Hair Accessories | Claw clips, scrunchies, headbands, butterfly clips |
| Jewelry | Gold hoops, layered necklaces, stackable rings |
| Beauty | Lip gloss, eyeshadow palettes, skincare |
| Room Decor | LED lights, wall art, aesthetic items |
| Fashion Accessories | Tote bags, sunglasses, belts |

### Price Range
- Target: $10-40 (sweet spot for impulse buys)
- Max: $75 (higher prices = lower conversion)

---

## Phase 2: Theme-Specific Product Lists

### Cozy Theme Products
Target aesthetic: Warm, soft, comfortable, hygge vibes
- [ ] Fuzzy/velvet scrunchie sets
- [ ] Oversized knit headbands
- [ ] Warm-toned gold jewelry
- [ ] Soft pink/nude lip products
- [ ] Cozy room decor (candles, blankets)

### Modern Theme Products
Target aesthetic: Clean lines, contemporary, sophisticated
- [ ] Minimalist gold hoop earrings
- [ ] Simple chain necklaces
- [ ] Clean beauty products
- [ ] Geometric room decor
- [ ] Sleek hair accessories

### Minimalist Theme Products
Target aesthetic: Simple, understated, quality basics
- [ ] Dainty stud earrings
- [ ] Simple hair clips (tortoise, neutral)
- [ ] Neutral lip colors
- [ ] Simple skincare essentials
- [ ] Clean-line accessories

### Luxury Theme Products
Target aesthetic: Elevated, expensive-looking, glamorous
- [ ] Statement earrings
- [ ] Layered necklace sets
- [ ] High-end dupes (skincare, makeup)
- [ ] Silk scrunchies
- [ ] Premium hair tools

### Fantasy Theme Products
Target aesthetic: Whimsical, magical, fairycore/cottagecore
- [ ] Butterfly hair clips
- [ ] Mushroom/fairy decor
- [ ] Celestial jewelry (moon, stars)
- [ ] Iridescent/holographic items
- [ ] Whimsical room lights

---

## Phase 3: Implementation

### Database Integration
Products validated through persona swarm get added to `AffiliateOffer` table with:
- Theme tags for matching to mod pages
- Persona validation score
- Manual curation flag

### Placement Strategy
1. **Mod Detail Pages** - Show products matching mod's themes
2. **Category Pages** - Curated picks by content type
3. **Dedicated Shop Page** - All curated products organized by theme

### Tracking
- Track clicks per product
- Track which themes convert best
- Iterate based on data

---

## Success Metrics

### 30-Day Target
- **Clicks needed**: ~650 (at 1.56% conversion = 10 sales)
- **Current pace**: ~385 clicks/month
- **Gap**: Need ~70% more clicks

### How to Increase Clicks
1. More prominent product placement
2. Better product-to-mod matching
3. More products = more opportunities
4. Seasonal/timely products

---

## Timeline

### Week 1
- [ ] Research & validate Cozy theme products (5)
- [ ] Research & validate Modern theme products (5)

### Week 2
- [ ] Research & validate Minimalist theme products (5)
- [ ] Research & validate Luxury theme products (5)

### Week 3
- [ ] Research & validate Fantasy theme products (5)
- [ ] Implement improved placement on mod pages

### Week 4
- [ ] Monitor performance
- [ ] Iterate on product selection
- [ ] Hit 10 sales target

---

## Once API is Unlocked

With Creators API access, we can:
1. Automate product discovery with search queries
2. Get real-time pricing and availability
3. Access full product catalog
4. Scale to hundreds of relevant products

The manual curation phase builds the foundation and validates what products actually convert.
