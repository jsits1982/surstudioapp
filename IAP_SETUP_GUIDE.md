# In-App Purchase Setup Guide

## Overview
This implementation uses `react-native-iap` for handling payments across iOS App Store and Google Play Store.

## Product Configuration

### Product ID: `surstudio_premium_unlock`
- Type: Non-consumable (one-time purchase)
- Price: $4.99 USD
- Description: "Unlock all raags, swaras, and premium features"

## Platform Setup

### iOS App Store Setup
1. **App Store Connect**:
   - Create new In-App Purchase
   - Product ID: `surstudio_premium_unlock`
   - Type: Non-Consumable
   - Price: $4.99
   - Title: "Premium Unlock"
   - Description: "Unlock all 220+ raags and premium features"

2. **iOS Permissions** (already included in Expo):
   - StoreKit framework is automatically included

### Google Play Console Setup
1. **Play Console**:
   - Go to Monetization > Products > In-app products
   - Create product ID: `surstudio_premium_unlock`
   - Price: $4.99
   - Title: "Premium Unlock"
   - Description: "Unlock all 220+ raags and premium features"

2. **Testing**:
   - Add test accounts in Play Console
   - Use test payment methods

## Testing Guide

### Development Testing (No Store Setup Required)
1. **Debug Mode**: The app automatically detects `__DEV__` mode
2. **Test Purchasing**: Uses simulated purchases in development
3. **Debug Controls**: Available in Settings when `__DEV__ = true`

### Production Testing
1. **iOS**: Use TestFlight with sandbox accounts
2. **Android**: Use internal testing track
3. **Test Purchases**: Will process real payments in test environment

## Key Features

### Purchase States
- ✅ **Free Mode**: 5 basic swaras, limited features
- ⭐ **Premium Mode**: All 220+ raags, 12 swaras, no ads

### Error Handling
- User cancellation
- Network errors
- Payment failures
- Invalid products
- Restore purchases (iOS)

### Security
- Purchase validation
- Token storage
- Transaction finishing
- Restore functionality

## Usage Flow

```javascript
1. User taps premium feature → Show upgrade modal
2. User taps "Upgrade Now" → Process payment
3. Payment successful → Unlock features + save status
4. App restart → Check saved premium status
```

## Debug Commands

**In Development Mode Only:**
- Toggle Premium/Free mode
- Reset all user data
- View purchase status
- Check product availability

## Production Checklist

- [ ] Configure products in App Store Connect
- [ ] Configure products in Google Play Console  
- [ ] Test with sandbox/test accounts
- [ ] Verify purchase restoration
- [ ] Test network failure scenarios
- [ ] Submit for app review

## Important Notes

1. **One-time Purchase**: Premium is permanent, no subscriptions
2. **Cross-platform**: Purchase on iOS works only on iOS (same for Android)
3. **Restore Purchases**: iOS users can restore via Settings
4. **Development**: Simulated purchases work without store setup
5. **Production**: Requires actual store configuration and approval
