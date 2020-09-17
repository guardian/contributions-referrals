## Why?

To store referral codes.

## What?
- CloudFormation for Lambda
- Code for lambda
- DDL for table creation

### Running locally
- Uses dummy data in `dummy-input.txt`
- AWS credentials are fetched from `[membership]` in `~/.aws/credentials` (no need to set environment variables)
- Config comes from SSM, path `/contributions-store/referral-lambda/db-config/..../CODE`
- `AWS_PROFILE=membership yarn run local` to execute (it automatically runs `tsc` to compile typescript first)
- Connects to CODE database, so you will need to run `open_ssh_tunnel -s CODE` (see https://github.com/guardian/contributions-platform/tree/master/contributions-store#how-to-connect if you're not sure what this means)

### Details
#### Endpoints
- `https://contribution-referrals.support.guardianapis.com/referral` PROD endpoint
- `https://contribution-referrals-code.support.guardianapis.com/referral` CODE endpoint

#### Sample Body
If the client sends an `email` field then it will fetch the user's braze UUID from identity API before inserting into the DB:
```
{
    "code": "someCode",
    "email": "someemail@gu.com",
    "source": "thankyou",
    "campaignId": "test-campaign" 
}
```

```
code = referral code
email = the email address of the user
source = referral source (thankyou, or the name of the braze campaign)
campaignId = the campaign (or 'moment') associated with the referral
```

If the client sends a `brazeUuid` then no identity API request is necessary:
```
{
    "code": "someCode",
    "brazeUuid": "12345",
    "source": "thankyou",
    "campaignId": "test-campaign" 
}
```

If testing in the AWS lambda console, the event data must be stringified:
```
{
  "body": "{\"source\": \"thankyou\",\"email\": \"someemail@gu.com\",\"code\": \"EHRKJH33\"}"
}
```
