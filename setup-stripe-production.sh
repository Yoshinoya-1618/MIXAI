#!/bin/bash
# MIXAI v1.4 Stripe Production Setup Script

set -e

echo "💳 MIXAI v1.4 Stripe Production Setup Starting..."

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it first:"
    echo "https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Verify Stripe authentication
echo "🔐 Verifying Stripe authentication..."
stripe auth

echo "📊 Creating Stripe products and prices..."

# Create MIXAI products in Stripe
echo "Creating Standard plan product..."
STANDARD_PRODUCT=$(stripe products create \
  --name "MIXAI Standard Plan" \
  --description "個人利用におすすめ - 月額6クレジット、6軸MIX調整" \
  --metadata[plan_code]=standard \
  --metadata[monthly_credits]=6.0 \
  --metadata[features]="6-axis mixing, genre targets, clarity control" \
  --format json | jq -r '.id')

echo "Standard Product ID: $STANDARD_PRODUCT"

echo "Creating Creator plan product..."
CREATOR_PRODUCT=$(stripe products create \
  --name "MIXAI Creator Plan" \
  --description "プロ利用におすすめ - 月額10クレジット、7軸MIX調整、参照曲解析" \
  --metadata[plan_code]=creator \
  --metadata[monthly_credits]=10.0 \
  --metadata[features]="7-axis mixing, reference analysis, presence control" \
  --format json | jq -r '.id')

echo "Creator Product ID: $CREATOR_PRODUCT"

echo "💰 Creating recurring prices..."

# Create monthly recurring prices (Japanese Yen)
echo "Creating Standard plan price (¥2,480/month)..."
STANDARD_PRICE=$(stripe prices create \
  --product $STANDARD_PRODUCT \
  --currency jpy \
  --unit-amount 248000 \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname "Standard Monthly (JPY)" \
  --metadata[plan_code]=standard \
  --format json | jq -r '.id')

echo "Standard Price ID: $STANDARD_PRICE"

echo "Creating Creator plan price (¥5,980/month)..."
CREATOR_PRICE=$(stripe prices create \
  --product $CREATOR_PRODUCT \
  --currency jpy \
  --unit-amount 598000 \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname "Creator Monthly (JPY)" \
  --metadata[plan_code]=creator \
  --format json | jq -r '.id')

echo "Creator Price ID: $CREATOR_PRICE"

echo "🎵 Creating harmony add-on price..."

# Create one-time price for harmony additions (Lite plan)
HARMONY_PRICE=$(stripe prices create \
  --product $(stripe products create \
    --name "MIXAI Harmony Add-on" \
    --description "ハモリ機能追加（Liteプラン用）" \
    --metadata[feature]=harmony \
    --format json | jq -r '.id') \
  --currency jpy \
  --unit-amount 50 \
  --nickname "Harmony Add-on (+0.5C)" \
  --metadata[credits]=0.5 \
  --format json | jq -r '.id')

echo "Harmony Add-on Price ID: $HARMONY_PRICE"

echo "🎫 Creating one-time credit packages..."

# Create various credit packages
CREDIT_PACKAGES=(
  "5:500:5クレジットパック"
  "10:900:10クレジットパック（10%オフ）"
  "20:1600:20クレジットパック（20%オフ）"
  "50:3750:50クレジットパック（25%オフ）"
)

CREDIT_PRICE_IDS=()

for package in "${CREDIT_PACKAGES[@]}"; do
  IFS=':' read -r credits amount description <<< "$package"
  
  PRODUCT_ID=$(stripe products create \
    --name "MIXAI Credit Package ($credits Credits)" \
    --description "$description" \
    --metadata[credits]=$credits \
    --metadata[type]=credit_package \
    --format json | jq -r '.id')
  
  PRICE_ID=$(stripe prices create \
    --product $PRODUCT_ID \
    --currency jpy \
    --unit-amount $((amount * 100)) \
    --nickname "$description" \
    --metadata[credits]=$credits \
    --format json | jq -r '.id')
  
  CREDIT_PRICE_IDS+=("$credits:$PRICE_ID")
  echo "Created credit package: $credits credits = ¥$amount (ID: $PRICE_ID)"
done

echo "🔗 Setting up webhook endpoints..."

# Create webhook endpoint for production
WEBHOOK_ENDPOINT=$(stripe webhook_endpoints create \
  --url "https://mixai.app/api/v1/webhooks/payment" \
  --enabled-events customer.subscription.created \
  --enabled-events customer.subscription.updated \
  --enabled-events customer.subscription.deleted \
  --enabled-events invoice.payment_succeeded \
  --enabled-events invoice.payment_failed \
  --enabled-events payment_intent.succeeded \
  --enabled-events payment_intent.payment_failed \
  --description "MIXAI v1.4 Production Webhook" \
  --format json)

WEBHOOK_SECRET=$(echo $WEBHOOK_ENDPOINT | jq -r '.secret')
WEBHOOK_ID=$(echo $WEBHOOK_ENDPOINT | jq -r '.id')

echo "Webhook Endpoint ID: $WEBHOOK_ID"
echo "Webhook Secret: $WEBHOOK_SECRET"

echo "💾 Generating environment variables..."

# Create .env.stripe file with production values
cat > .env.stripe << EOF
# MIXAI v1.4 Stripe Production Configuration
# Generated on $(date)

# Stripe Keys (LIVE)
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET

# Product IDs
STRIPE_STANDARD_PRODUCT_ID=$STANDARD_PRODUCT
STRIPE_CREATOR_PRODUCT_ID=$CREATOR_PRODUCT

# Price IDs
STRIPE_STANDARD_PRICE_ID=$STANDARD_PRICE
STRIPE_CREATOR_PRICE_ID=$CREATOR_PRICE
STRIPE_HARMONY_PRICE_ID=$HARMONY_PRICE

# Credit Package Price IDs
$(for item in "${CREDIT_PRICE_IDS[@]}"; do
  IFS=':' read -r credits price_id <<< "$item"
  echo "STRIPE_CREDITS_${credits}_PRICE_ID=$price_id"
done)

# Webhook Configuration
STRIPE_WEBHOOK_ENDPOINT_ID=$WEBHOOK_ID

# Tax Configuration (Japan)
STRIPE_TAX_RATE_JP=tax_1234567890  # Set actual tax rate ID

# Features Configuration
PAYMENT_PROVIDER=stripe
PAYMENT_CURRENCY=jpy
PAYMENT_SUCCESS_URL=https://mixai.app/checkout/success
PAYMENT_CANCEL_URL=https://mixai.app/pricing
EOF

echo "📋 Creating Stripe configuration summary..."

cat > stripe-production-setup.md << EOF
# MIXAI v1.4 Stripe Production Setup

## Generated on: $(date)

### Products Created
- **Standard Plan**: $STANDARD_PRODUCT
- **Creator Plan**: $CREATOR_PRODUCT

### Prices Created
- **Standard Monthly**: $STANDARD_PRICE (¥2,480/month)
- **Creator Monthly**: $CREATOR_PRICE (¥5,980/month)
- **Harmony Add-on**: $HARMONY_PRICE (¥50/0.5 credits)

### Credit Packages
$(for item in "${CREDIT_PRICE_IDS[@]}"; do
  IFS=':' read -r credits price_id <<< "$item"
  echo "- **$credits Credits**: $price_id"
done)

### Webhook Configuration
- **Endpoint**: https://mixai.app/api/v1/webhooks/payment
- **ID**: $WEBHOOK_ID
- **Secret**: $WEBHOOK_SECRET (store securely!)

### Next Steps
1. Update your production environment with the generated .env.stripe values
2. Test webhook delivery in Stripe Dashboard
3. Configure tax rates for Japan (消費税 10%)
4. Set up customer portal for subscription management
5. Enable payment method types (card, konbini, etc.)

### Security Notes
- All keys shown are for production use only
- Store webhook secrets securely
- Enable webhook signature verification
- Monitor failed payment events

### Tax Compliance (Japan)
- Ensure proper invoicing for Japanese customers
- Configure automatic tax calculation
- Set up receipt generation system
EOF

echo "✅ Stripe production setup completed!"
echo ""
echo "📁 Files generated:"
echo "   - .env.stripe (environment variables)"
echo "   - stripe-production-setup.md (documentation)"
echo ""
echo "⚠️  Important:"
echo "   - Replace placeholder keys in .env.stripe with actual LIVE keys"
echo "   - Test webhook endpoint thoroughly"
echo "   - Configure tax rates for Japanese customers"
echo "   - Enable required payment methods in Stripe Dashboard"
echo ""
echo "🔒 Security checklist:"
echo "   - Keep webhook secrets secure"
echo "   - Enable webhook signature verification"
echo "   - Monitor payment events and disputes"
echo "   - Set up fraud detection rules"

echo "💳 Stripe production environment ready for MIXAI v1.4!"