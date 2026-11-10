# Turn on "Continue with Google" (one-time, about 10 minutes)

The buttons are already in the site. Google only works after you switch it on in two places.
Your Supabase project: `https://wcikankedtelqbojzjdm.supabase.co`
Your site: `https://nuasalibrary.vercel.app`

## 1. Google Cloud Console (console.cloud.google.com)
1. Create a project (or pick one), e.g. "NUASA Library".
2. **APIs & Services > OAuth consent screen**: choose *External*. App name `NUASA Library`, add your support email and developer email. Scopes: leave the defaults (email, profile, openid).
3. Click **Publish app** so every student can sign in. (In "Testing" mode only listed test users can.)
4. **APIs & Services > Credentials > Create credentials > OAuth client ID > Web application**.
   - Authorized JavaScript origins: `https://nuasalibrary.vercel.app`
   - Authorized redirect URIs: `https://wcikankedtelqbojzjdm.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client secret**.

## 2. Supabase (supabase.com/dashboard)
1. **Authentication > Providers > Google**: switch on, paste the Client ID and Client secret, Save.
2. **Authentication > URL Configuration**:
   - Site URL: `https://nuasalibrary.vercel.app`
   - Redirect URLs: add `https://nuasalibrary.vercel.app/**`
     (add `http://localhost:3000/**` too if you test locally)

## 3. Test
Open the site, tap **Sign in > Continue with Google**, pick an account. You land back on the site signed in with a welcome message, and your Google name and photo appear in the menu.

## Notes
- Google users get a row in `profiles` automatically (name from Google). If you already have a database trigger that creates profiles on sign-up, it keeps working.
- If the button opens a page saying "provider is not enabled", step 2.1 has not been saved yet.
- If you see "redirect_uri_mismatch", the redirect URI in step 1.4 must match exactly.
