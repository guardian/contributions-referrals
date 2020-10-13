Data recovery script for if create-code Lambda fails
====================================================

This node 12 script was written to recover from an issue where we hit the `referral-code` API Gatway and underlying
`create-code` Lambda with too many requests. The API Gateway was set up as a [Conntected Content](https://www.braze.com/docs/user_guide/personalization_and_dynamic_content/connected_content/making_an_api_call/) 
call from a Braze email campaign:

```
{% assign shareCode = "now" | date: "%s%6N" %}
{% connected_content
     https://[environment-domain]/referral-code
     :method post
     :headers {
     }
     :body code={{shareCode}}&brazeUuid={{${user_id}}}&source=email&campaignId={{campaign_id}}
     :content_type application/json
     :save created
%}
```

On 5 October 2020, Braze sent around 170K requests to that API Gateway endpoint in about 2 minutes, and although AWS 
Lambda scaled appropriately, there was a bottleneck on the number of DB connections allowed through to RDS (~200). 
Hence around half the Lambda executions failed to complete with a `ThrottlingException: Rate exceeded` error
and so failed to register the Braze-generated referral code against the referrering user's ID.  
In hindsight, we should have set up a [Delivery Speed Rate-Limit](https://www.braze.com/docs/user_guide/engagement_tools/campaigns/testing_and_more/rate-limiting/#delivery-speed-rate-limiting) 
on the Braze canvas to around 10,000 requests per minute.

The data was recovered by doing an extract from CloudWatch logs for all log lines for that Lambda 
(luckily it was a short period of time). 

The relevant CloudWatch logs were [exported into S3](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/S3ExportTasksConsole.html) 
(ensuring write permissions), and those S3 files were downloaded a local dev machine 
(`aws s3 sync s3://bucket-with-logs-in/exportedLogs ./exportedLogs`) where this script was then developed and run. 

This node script was written to scan the local `exportedLogs` directory and filter out the log lines where the POST 
request body got fortunately written out. It then reformats all of those into a `statements.sql` file of idempotent 
PostGres `INSERT ... ON CONFLICT (referral_code) DO NOTHING` statements.

That SQL file was then split into chunks of 30,000 lines and each one was imported into 
[psql](https://blog.timescale.com/tutorials/how-to-install-psql-on-mac-ubuntu-debian-windows/) and executed against the
PROD [Contributions DB](https://github.com/guardian/contributions-platform/tree/master/contributions-store). 
It took around 15 minutes to process each file on a single thread.

---

To execute the script once the CloudWatch data has been downloaded into `./exportedLogs`:

```
$ nvm use
$ node extract_from_lambda_logs.js
```

Whereafter there should be some INSERT statements in the `statements.sql` file just like `example_statements.sql`.