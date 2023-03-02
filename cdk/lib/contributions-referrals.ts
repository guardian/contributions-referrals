import path from "path";
import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack, GuStringParameter} from "@guardian/cdk/lib/constructs/core";
import {GuVpc} from "@guardian/cdk/lib/constructs/ec2";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {Effect, ManagedPolicy, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

export interface ContributionsReferralsProps extends GuStackProps {
  certificateId: string;
  domainName: string;
  hostedZoneId: string;
  streamArn: string;
}

export class ContributionsReferrals extends GuStack {
  constructor(scope: App, id: string, props: ContributionsReferralsProps) {
    super(scope, id, props);


    // ---- CFN template resources ---- //
    const templateFilePath = path.join(__dirname, "../..", "cfn.json");
    new CfnInclude(this, "Template", {
      templateFile: templateFilePath,
    });


    // ---- Parameters ---- //
    const securityGroupToAccessPostgres = new GuStringParameter(
        this,
        "SecurityGroupToAccessPostgres-CDK",
        {
          description:
              "Security group to access the RDS instance",
        }
    );


    // ---- Miscellaneous constants ---- //
    const app = "contributions-referrals";
    const vpc = GuVpc.fromIdParameter(this, "vpc");
    const runtime = Runtime.NODEJS_16_X;
    const fileName = "contributions-referrals.zip";
    const environment = {
      "Stage": this.stage,
    };
    const securityGroups = [SecurityGroup.fromSecurityGroupId(this, "security-group", securityGroupToAccessPostgres.valueAsString)];
    const vpcSubnets = {
      subnets: GuVpc.subnetsFromParameter(this),
    };
    const awsLambdaVpcAccessExecutionRole =
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
    const awsLambdaBasicExecutionRole =
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    const sharedLambdaProps = {
      app,
      runtime,
      fileName,
      vpc,
      vpcSubnets,
      securityGroups,
      environment,
    };


    // ---- API-triggered lambda functions ---- //
    const createCodeLambda = new GuLambdaFunction(this, "create-code", {
      handler: "create-code/lambda/lambda.handler",
      functionName: `${app}-create-code-${this.stage}-CDK`,
      ...sharedLambdaProps,
    });

    const referralCountLambda = new GuLambdaFunction(this, "referral-count", {
      handler: "referral-count/lambda/lambda.handler",
      functionName: `${app}-referral-count-${this.stage}-CDK`,
      ...sharedLambdaProps,
    });


    // ---- API gateway ---- //
    const contributionsReferralsApi = new GuApiGatewayWithLambdaByPath(this, {
      app,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
      monitoringConfiguration: {
        snsTopicName: "conversion-dev",
        http5xxAlarm: {
          tolerated5xxPercentage: 1,
        }
      },
      targets: [
        {
          path: "/referral-code-queue",
          httpMethod: "POST",
          lambda: createCodeLambda,
        },
        {
          path: "/referral-count",
          httpMethod: "GET",
          lambda: referralCountLambda,
        },
      ],
    })


    // ---- DNS ---- //
    const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;

    const cfnDomainName = new CfnDomainName(this, "DomainName", {
      domainName: props.domainName,
      regionalCertificateArn: certificateArn,
      endpointConfiguration: {
        types: ["REGIONAL"]
      }
    });

    new CfnBasePathMapping(this, "BasePathMapping", {
      domainName: cfnDomainName.ref,
      restApiId: contributionsReferralsApi.api.restApiId,
      stage: contributionsReferralsApi.api.deploymentStage.stageName,
    });

    new CfnRecordSet(this, "DNSRecord", {
      name: props.domainName,
      type: "CNAME",
      hostedZoneId: props.hostedZoneId,
      ttl: "60",
      resourceRecords: [
        cfnDomainName.attrRegionalDomainName
      ],
    });


    // ---- Apply policies ---- //
    const ssmInlinePolicy: Policy = new Policy(this, "SSM inline policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "ssm:GetParametersByPath",
            "ssm:GetParameter"
          ],
          resources: [
            `arn:aws:ssm:${this.region}:${this.account}:parameter/${app}/db-config/${props.stage}`,
            `arn:aws:ssm:${this.region}:${this.account}:parameter/${app}/idapi/${props.stage}/*`,
            `arn:aws:ssm:${this.region}:${this.account}:parameter/${props.stage}/support/${app}/db-config`,
            `arn:aws:ssm:${this.region}:${this.account}:parameter/${props.stage}/support/${app}/idapi/*`,
          ]
        }),
      ],
    })

    const s3InlinePolicy: Policy = new Policy(this, "S3 inline policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:GetObject"
          ],
          resources: [
            "arn:aws:s3::*:membership-dist/*"
          ]
        }),
      ],
    })

    const lambdaFunctions: GuLambdaFunction[] = [
      createCodeLambda,
      referralCountLambda,
    ]

    lambdaFunctions.forEach((l: GuLambdaFunction) => {
      l.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)
      l.role?.addManagedPolicy(awsLambdaBasicExecutionRole)
      l.role?.attachInlinePolicy(ssmInlinePolicy)
      l.role?.attachInlinePolicy(s3InlinePolicy)
    })
  }
}
