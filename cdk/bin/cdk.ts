import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { ContributionsReferrals } from "../lib/contributions-referrals";

const app = new App();
new ContributionsReferrals(app, "ContributionsReferrals-CODE", { stack: "support", stage: "CODE" });
new ContributionsReferrals(app, "ContributionsReferrals-PROD", { stack: "support", stage: "PROD" });
