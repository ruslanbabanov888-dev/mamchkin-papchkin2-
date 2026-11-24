# Monetization implementation plan (RuStore Android)

This document is an implementation plan, not a declaration that advertising or payments are already integrated.

## Confirmed product direction

- The free experience may show advertising on a two-hour cadence.
- Additional decks are intended to be sold.
- The exact entitlement relationship between purchasing a deck and suppressing ads must be confirmed before implementing purchase logic. Do not silently treat a deck purchase as a permanent ad-free entitlement.
- Ads and purchase prompts must never interrupt an active challenge, card resolution, or family interaction.

## Advertising integration gate

Candidate SDK: Yandex Mobile Ads Android SDK 8.

Before adding the SDK:
1. Confirm the RuStore age rating and whether the app is classified as child-directed. The app is designed for parents, but includes baby-related activities; do not infer the classification solely from the presence of a baby.
2. Confirm the SDK's supported non-personalized / age-restricted request mode for the chosen classification.
3. Configure age/privacy flags before SDK initialization. Yandex documentation describes the age-restricted-user manifest metadata and recommends applying privacy settings before initialization.
4. Register the app and ad units in Yandex Advertising Network.
5. Declare the SDK, ad network, and any mediation components in RuStore Console.
6. Update the privacy policy with the actual SDK, data categories, and purposes before release.
7. Use test ad units until the full flow has been verified.

Initial UX preference: user-initiated rewarded ad to unlock a temporary benefit, or a clearly signposted ad during a natural pause. Do not show forced full-screen ads during active gameplay. The precise two-hour rule and benefit must be product-configured and tested.

## Payment integration gate

Use RuStore Pay SDK for new in-app purchases; do not start a new implementation with the deprecated BillingClient.

Before integration:
1. Create products in RuStore Console with final IDs, prices, descriptions, and purchase types.
2. Decide whether decks are permanent non-consumable entitlements.
3. Decide whether any product also grants ad-free time or permanent ad removal.
4. Verify purchases and restore entitlements on app launch and after reinstall, following the current Pay SDK flow.
5. Handle pending, cancelled, failed, refunded, and already-owned purchases.
6. Do not unlock paid content based only on a client-side localStorage flag.

## Capacitor bridge

The current project is HTML/JS + Capacitor. RuStore Pay and Yandex Mobile Ads are native Android SDKs; a Capacitor plugin/native Kotlin bridge is required. Keep the bridge isolated behind JS interfaces so web preview can show a safe unavailable state.

## Release checks

- Test mode and production mode use separate ad unit/product configuration.
- Ad timer survives process death and uses elapsed-time semantics safely.
- Buying a deck does not reset or alter game progress.
- Purchases are recoverable from RuStore after reinstall.
- Ads are not requested before privacy configuration.
- All SDKs are declared in RuStore Console and in the privacy policy.
- Release build is signed; debug APK is not submitted as the store release.
