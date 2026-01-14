# Hosting Deployment Guide: Firebase Custom Domain with Squarespace DNS

## Table of Contents
1. [Domain Extension Selection](#domain-extension-selection)
2. [DNS Field Explanations](#dns-field-explanations)
3. [Squarespace DNS Configuration](#squarespace-dns-configuration)
4. [Firebase Custom Domain Setup](#firebase-custom-domain-setup)
5. [Troubleshooting](#troubleshooting)
6. [Timeline Expectations](#timeline-expectations)

---

## Domain Extension Selection

### Overview
Firebase Project IDs **CANNOT** be changed after project creation. The default URL `habit-tracker-f3c23.web.app` is permanent. To achieve a branded URL like `axiomforge.com`, you must add a custom domain.

### Domain Extension Comparison

| Extension | Annual Cost | Best For | Trust Level | Notes |
|-----------|-------------|----------|-------------|-------|
| .com | $10-15 | Everyone | Highest | Gold standard, 44% memorability score |
| .app | $15-20 | PWAs, mobile apps | High | HSTS preloaded (HTTPS mandatory) |
| .io | $30-60 | Tech startups, developer tools | Medium | Popular in tech, less recognized by consumers |
| .dev | $15-20 | Developer tools, APIs | Medium | HSTS preloaded |
| .biz | $15-20 | Business sites | Low | Perceived as low-quality/spam |
| .club | $10-15 | Communities | Low | Niche association |
| .eu | $10-15 | EU-only | Medium | Requires EU residency |

### SEO Impact

**Direct Impact**: Google treats all valid TLDs equally. The algorithm doesn't favor .com over .io or .app.

**Indirect Impact**: User behavior creates SEO effects:
- .com domains get higher click-through rates (users trust them more)
- .com domains earn more backlinks (familiarity bias)
- User behavior patterns favor .com

### Recommendation for Habit Tracker PWA

For a **consumer-facing PWA** targeting general users:

1. **axiomforge.com** - Maximum trust, easy to remember, professional
2. **axiomforge.app** - Perfect for PWAs, modern, secure by default (HSTS)
3. **axiom-forge.com** - Hyphenated fallback if .com unavailable

**Avoid**: .io (too expensive for consumer app), .biz/.club (low trust), .eu (geographic restrictions)

---

## DNS Field Explanations

### Host (Nombre/Host)
The subdomain or part of your domain this record applies to.

**Common values**:
- `@` or empty = Root domain (axiomforge.com)
- `www` = www subdomain (www.axiomforge.com)
- `blog` = blog subdomain (blog.axiomforge.com)

### TTL (Time To Live / Tiempo de vida)
How long (in seconds) DNS servers should cache this record before checking for updates.

**Recommended values**:
- During setup: `300` (5 minutes) for faster updates
- After setup: `3600` (1 hour) or higher for better performance
- Default: Usually leave at Squarespace's default

### IP Address (Dirección IP)
The server address where your website lives. Firebase provides 2 IP addresses that look like: `151.101.1.195`

### Data/Text (for TXT records)
The verification string provided by Firebase, looking like: `firebase=abc123xyz...`

---

## Squarespace DNS Configuration

### Accessing DNS Settings

1. Go to **Squarespace Dashboard**
2. Click **Settings** → **Domains** (Configuración → Dominios)
3. Click your domain name
4. Click **DNS Settings** (Configuración de DNS)
5. Scroll to **Custom Records** (Registros personalizados)

### Adding DNS Records

1. Click **Add Record** (Agregar registro)
2. Choose record type from dropdown (TXT or A)
3. Fill in the fields
4. Click **Add** or **Save**

### Removing DNS Records

1. Find the record in the list
2. Click the **trash icon** or **X** next to it
3. Confirm deletion

---

## Firebase Custom Domain Setup

### Required DNS Records

Firebase requires **2 types of records**: TXT (verification) and A (pointing).

#### Step 1: Add TXT Record (Domain Verification)

Get values from: **Firebase Console → Hosting → Add custom domain**

| Field | Value |
|-------|-------|
| Type | TXT |
| Host | `@` |
| Data/Text | `firebase=abc123xyz...` (provided by Firebase) |
| TTL | Default (or 3600) |

#### Step 2: Add A Records (Point Domain to Firebase)

Firebase provides **2 IP addresses**. Add **2 separate A records**, both with host `@`.

**First A Record**:
| Field | Value |
|-------|-------|
| Type | A |
| Host | `@` |
| IP Address | First IP from Firebase (e.g., `151.101.1.195`) |
| TTL | Default |

**Second A Record**:
| Field | Value |
|-------|-------|
| Type | A |
| Host | `@` |
| IP Address | Second IP from Firebase (e.g., `151.101.65.195`) |
| TTL | Default |

#### Step 3: Add A Records for www Subdomain (Recommended)

To make `www.axiomforge.com` work:

**Third A Record**:
| Field | Value |
|-------|-------|
| Type | A |
| Host | `www` |
| IP Address | First Firebase IP |
| TTL | Default |

**Fourth A Record**:
| Field | Value |
|-------|-------|
| Type | A |
| Host | `www` |
| IP Address | Second Firebase IP |
| TTL | Default |

### Complete Record Set

You should have **5 total records**:

```
Custom Records:
├── TXT  | @   | firebase=abc123...
├── A    | @   | 151.101.1.195
├── A    | @   | 151.101.65.195
├── A    | www | 151.101.1.195
└── A    | www | 151.101.65.195
```

### Update Firebase Config (After Domain is Verified)

In `js/firebase-config.js`, update the `authDomain`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "axiomforge.com",  // Change from habit-tracker-f3c23.firebaseapp.com
  projectId: "habit-tracker-f3c23",
  // ... rest of config
};
```

---

## Troubleshooting

### Error: "Falló una o más de las solicitudes HTTP GET de Hosting del desafío de ACME: 403 Forbidden"

**Problem**: Domain still pointing to Squarespace's servers instead of Firebase.

**IP addresses in error (Squarespace's servers)**:
- 198.185.159.144
- 198.185.159.145
- 198.49.23.144
- 198.49.23.145

**Solution**: Delete Squarespace Default DNS Records

#### Step-by-Step Fix:

1. **Access DNS Settings** in Squarespace (see above)

2. **Find "Squarespace Defaults" section**
   - May be labeled: "Squarespace Defaults" or "Valores predeterminados de Squarespace"
   - Contains A/CNAME records pointing to Squarespace IPs (198.x.x.x)

3. **Delete ALL default records**
   - Click the **red trash can icon** for each default record
   - Your domain can't point to Firebase while these exist

4. **Verify Custom Records remain**
   - Ensure your 5 Firebase records (1 TXT + 4 A records) are still present
   - If missing, re-add them

5. **Save and wait 15-30 minutes**

6. **Check DNS propagation**: https://www.whatsmydns.net
   - Enter domain: `axiomforge.com`
   - Select "A" record type
   - Should see Firebase IPs (151.101.x.x), NOT Squarespace IPs (198.x.x.x)

7. **Verify in Firebase Console** once DNS shows Firebase IPs

### DNS Records Configuration

**WRONG (causes 403 error)**:
```
Squarespace DNS:
├── Squarespace Defaults (CONFLICTS!)
│   ├── A record → 198.185.159.144
│   └── A record → 198.185.159.145
└── Custom Records
    ├── TXT @ firebase=...
    ├── A @ 151.101.1.195
    └── A @ 151.101.65.195
```

**CORRECT**:
```
Squarespace DNS:
├── Squarespace Defaults (EMPTY - deleted ✓)
└── Custom Records
    ├── TXT @ firebase=...
    ├── A @ 151.101.1.195
    ├── A @ 151.101.65.195
    ├── A www 151.101.1.195
    └── A www 151.101.65.195
```

### Why This Happens

Firebase cannot provision an SSL certificate if there are any A records or CNAME records that point to other providers (like Squarespace). When you buy a domain through Squarespace, it automatically adds default DNS records pointing to Squarespace's hosting. These must be removed for external hosting to work.

### What Squarespace DNS Records to Delete/Keep

When cleaning up your Squarespace DNS settings, you'll encounter different types of record sections:

#### ❌ DELETE: "Squarespace Domain Connect"
**Delete this section.** Domain Connect is for automatically configuring services to work with Squarespace hosting. Since you're pointing to Firebase, you don't need it and it may cause conflicts.

#### ✅ KEEP: "Email Security" Records
**Keep these records!** Email security records (MX, SPF, DKIM, DMARC) are for email functionality and **do NOT interfere** with Firebase hosting. These handle a completely different service:
- **A records** = Where your website lives (Firebase)
- **MX/email records** = Where your email is handled (Squarespace or other email provider)

They can coexist peacefully.

**Exception**: Only delete email records if:
- You're NOT using email with this domain at all
- You're migrating email to a different provider (then replace with new provider's records)

#### Correct DNS Configuration

Your Squarespace DNS should look like this:

```
Squarespace DNS Settings:

Custom Records Section:
├── TXT  | @   | firebase=abc123...
├── A    | @   | 151.101.1.195 (Firebase IP 1)
├── A    | @   | 151.101.65.195 (Firebase IP 2)
├── A    | www | 151.101.1.195
└── A    | www | 151.101.65.195

Email Security Section (KEEP):
├── MX   | @   | (Squarespace email server)
├── TXT  | @   | SPF record (v=spf1...)
└── TXT  | _dmarc | DMARC record

Squarespace Domain Connect Section:
└── (DELETE THIS ENTIRE SECTION)

Squarespace Defaults Section:
└── (MUST BE EMPTY - DELETE ALL)
```

### Verifying DNS Propagation

After deleting Squarespace defaults and adding Firebase records, you must verify that DNS has actually propagated before trying Firebase verification again.

#### Step 1: Check A Record Propagation

1. Go to: **https://www.whatsmydns.net**
2. **Enter your domain**: `axiomforge.com` (without www)
3. **Select record type**: Choose **A** from the dropdown
4. **Click Search**

#### Step 2: Analyze the Results

**What you SHOULD see** (Firebase IPs):
- `151.101.1.195`
- `151.101.65.195`
- Or similar `151.101.x.x` addresses
- **Green checkmarks** across multiple locations globally

**What you should NOT see** (Squarespace IPs):
- `198.185.159.144`
- `198.185.159.145`
- `198.49.23.144`
- `198.49.23.145`

#### Step 3: Interpret Results

**Scenario A: Green checkmarks with Firebase IPs** (151.101.x.x)
- ✅ DNS has propagated successfully
- Wait 1-2 hours for SSL provisioning, then try Firebase verification
- SSL certificate provisioning can take up to 24 hours

**Scenario B: Mix of Firebase and Squarespace IPs**
- ⏳ DNS is still propagating (normal during transition)
- Wait another 2-4 hours, check again
- Don't attempt Firebase verification yet

**Scenario C: All showing Squarespace IPs** (198.x.x.x)
- ❌ DNS changes haven't propagated yet OR weren't saved correctly
- Go back to Squarespace DNS settings and verify:
  - Squarespace Defaults section is EMPTY
  - Your 5 Firebase records are present in Custom Records
  - Save changes again if needed
- Wait 30 minutes and re-check

#### Step 4: Verify TXT Record (Firebase Verification String)

1. Go to: **https://www.whatsmydns.net**
2. **Enter**: `axiomforge.com`
3. **Select**: **TXT** from dropdown
4. **Click Search**

**Should see**: `firebase=abc123...` (your Firebase verification string)

#### Propagation Timeline

| Time Elapsed | What to Expect |
|--------------|----------------|
| 0-30 min | Too early - DNS changes just saved |
| 30 min - 2 hours | DNS propagating - may show mixed results |
| 2-4 hours | Most DNS servers should show Firebase IPs |
| 4-24 hours | Should be fully propagated globally |
| > 24 hours | Something is wrong - verify DNS settings again |

**Important**: Don't keep trying Firebase verification repeatedly if DNS hasn't propagated. It won't help and may cause rate limiting. Wait for whatsmydns.net to show Firebase IPs globally, then try verification once.

### Other Common Issues

**Problem**: "Record already exists"
- **Solution**: Delete the existing record first, then add the new one

**Problem**: Can't add 2 A records with same host
- **Solution**: This is normal! Add them one at a time with the same host (`@`) but different IP addresses

**Problem**: Domain not working after 48 hours
- **Solution**: Check DNS propagation at whatsmydns.net. Verify all 5 records are saved correctly in Squarespace

---

## Timeline Expectations

### DNS Propagation

After adding/changing DNS records:
- **15-30 minutes**: DNS starts propagating
- **1-2 hours**: Most DNS servers updated
- **24-48 hours**: Complete global propagation

### SSL Certificate Provisioning

After DNS points to Firebase:
- **1-2 hours**: SSL certificate provisioning (typical)
- **Up to 24 hours**: Maximum expected time
- Firebase automatically handles HTTPS and SSL renewal

### Complete Setup Timeline

```
Day 0, Hour 0:  Purchase domain
Day 0, Hour 0:  Add custom domain in Firebase Console
Day 0, Hour 0:  Add TXT + A records in Squarespace
Day 0, Hour 0:  DELETE Squarespace default records ← CRITICAL
Day 0, Hour 1:  DNS propagation begins
Day 0, Hour 2:  Try Firebase verification
Day 0-1:        SSL certificate provisioning
Day 1-2:        Complete global DNS propagation
```

---

## Important Notes

1. **Get IP addresses from Firebase Console** - Don't copy examples! Each project may have different IPs:
   - Firebase Console → Hosting → Add custom domain
   - Follow wizard for exact IPs

2. **Keep TXT record permanently** - Firebase needs this to renew SSL certificates

3. **Squarespace limitations**: Domains via Nameserver connect only support A, AAAA, CNAME, MX, SRV, and TXT records (sufficient for Firebase)

4. **Remove conflicting records**: If Squarespace shows existing A/CNAME records pointing elsewhere, delete them first

5. **HTTPS is automatic**: Firebase provisions and renews SSL certificates automatically

6. **Test both domains**: After setup, verify both `axiomforge.com` and `www.axiomforge.com` work

---

## Resources

### Official Documentation
- [Connect a custom domain | Firebase Hosting](https://firebase.google.com/docs/hosting/custom-domain)
- [Adding DNS records to your domain – Squarespace Help Center](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-DNS-records-to-your-domain)
- [Pointing a Squarespace domain – Squarespace Help Center](https://support.squarespace.com/hc/en-us/articles/215744668-Pointing-a-Squarespace-domain)

### Verification Tools
- DNS Propagation Checker: https://www.whatsmydns.net
- Google Admin Toolbox Dig: https://toolbox.googleapps.com/apps/dig/

### Domain Registrars
- Namecheap: https://www.namecheap.com
- Cloudflare Registrar: https://www.cloudflare.com/products/registrar/
- Porkbun: https://porkbun.com
- Google Domains: https://domains.google

---

## Deployment Checklist

- [ ] Purchase custom domain (.com recommended)
- [ ] Access Squarespace DNS settings
- [ ] Delete ALL Squarespace default records
- [ ] Delete "Squarespace Domain Connect" section
- [ ] Keep "Email Security" records (MX, SPF, DKIM, DMARC)
- [ ] Add TXT record for Firebase verification
- [ ] Add 2 A records (host: @) with Firebase IPs
- [ ] Add 2 A records (host: www) with Firebase IPs
- [ ] Wait 30 minutes for DNS propagation
- [ ] Check DNS A records with whatsmydns.net (should show Firebase IPs 151.101.x.x)
- [ ] Check DNS TXT record with whatsmydns.net (should show firebase=...)
- [ ] Verify domain in Firebase Console (only after DNS shows Firebase IPs)
- [ ] Wait for SSL certificate provisioning (1-24 hours)
- [ ] Update `authDomain` in firebase-config.js
- [ ] Deploy to Firebase: `firebase deploy --only hosting`
- [ ] Test both axiomforge.com and www.axiomforge.com
- [ ] Verify HTTPS works (should be automatic)

---

**Last Updated**: 2026-01-14
**Project**: Axiom Forge Habit Tracker PWA
**Firebase Project ID**: habit-tracker-f3c23
**Custom Domain**: axiomforge.com (pending setup)
