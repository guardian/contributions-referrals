import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { codeProps, prodProps } from "../bin/cdk";
import { ContributionsReferrals } from "./contributions-referrals";

describe("The ContributionsReferrals stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const codeStack = new ContributionsReferrals(
        app,
        "ContributionsReferrals-CODE",
        codeProps
    );
    const prodStack = new ContributionsReferrals(
        app,
        "ContributionsReferrals-PROD",
        prodProps
    );
    expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
    expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
  });
});
