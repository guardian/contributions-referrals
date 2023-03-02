import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ContributionsReferrals } from "./contributions-referrals";

describe("The ContributionsReferrals stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new ContributionsReferrals(app, "ContributionsReferrals", { stack: "support", stage: "TEST" });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
