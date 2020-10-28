# contributions-referrals
System for recording contributions referrals. Integrates with Braze.

Architecture diagram: https://docs.google.com/drawings/d/1IaptIb3698hGH__L10Mlpgv74MIyk4gsOEX1rOafgBc/edit

### Cloudformation stack

Three lambdas:
1. `create-code` - creates new referral codes in the DB, mapped to the braze UUID of the referrer.
2. `braze-upload` - monitors the acquisitions stream for referrals, and sends them to braze.
3. `referral-count` - returns the number of referrals for a given braze UUID since a given date.

Has a single API gateway with 2 endpoints:
- `POST /referral-code-queue` - for requests to the `create-code` lambda. Events are queued with SQS, to protect the DB.
- `GET /referral-count`- for requests to the `referral-count` lambda. Requires an API key.
