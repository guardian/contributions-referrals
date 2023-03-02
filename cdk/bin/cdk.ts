import "source-map-support/register";
import {App} from "aws-cdk-lib";
import {ContributionsReferrals, ContributionsReferralsProps} from "../lib/contributions-referrals";

const app = new App();

export const codeProps: ContributionsReferralsProps = {
    stack: "support",
    stage: "CODE",
    certificateId: "b384a6a0-2f54-4874-b99b-96eeff96c009",
    domainName: "contribution-referrals-code.support.guardianapis.com",
    hostedZoneId: "Z3KO35ELNWZMSX",
    streamArn: "arn:aws:kinesis:eu-west-1:865473395570:stream/acquisitions-stream-CODE",
};

export const prodProps: ContributionsReferralsProps = {
    stack: "support",
    stage: "PROD",
    certificateId: "b384a6a0-2f54-4874-b99b-96eeff96c009",
    domainName: "contribution-referrals.support.guardianapis.com",
    hostedZoneId: "Z3KO35ELNWZMSX",
    streamArn: "arn:aws:kinesis:eu-west-1:865473395570:stream/acquisitions-stream-PROD",
};

new ContributionsReferrals(app, "ContributionsReferrals-CODE", codeProps);
new ContributionsReferrals(app, "ContributionsReferrals-PROD", prodProps);

