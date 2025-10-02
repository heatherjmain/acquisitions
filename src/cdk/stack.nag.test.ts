import { App, Aspects, Stack } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { AcquisitionsStack } from "./stack";

jest.mock<typeof import("aws-cdk-lib/aws-lambda-nodejs")>(
  "aws-cdk-lib/aws-lambda-nodejs",
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require("cdk-lambda-nodejs-mock"),
);

describe("CDK Nag", () => {
  describe("AcquisitionStack", () => {
    let stack: Stack;

    beforeAll(() => {
      stack = new AcquisitionsStack(new App(), "nag-app-stack");

      NagSuppressions.addStackSuppressions(stack, [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "The lambda role is known to be basic and based on managed policies",
        },
        {
          id: "AwsSolutions-APIG3",
          reason:
            "WAF would be added or API made private for production service",
        },
        {
          id: "AwsSolutions-VPC7",
          reason: "Flow logs are out of scope",
        },
        {
          id: "AwsSolutions-SMG4",
          reason: "Auto rotation out of scope for dummy service",
        },
        {
          id: "AwsSolutions-RDS2",
          reason: "Encryption out of scope for dummy service",
        },
        {
          id: "AwsSolutions-RDS6",
          reason: "DB auth out of scope for dummy service",
        },
        {
          id: "AwsSolutions-RDS10",
          reason: "Deletion protection out of scope for dummy service",
        },
        {
          id: "AwsSolutions-APIG2",
          reason: "Request validation out of scope for dummy service",
        },
        {
          id: "AwsSolutions-APIG1",
          reason: "Access logging out of scope for dummy service",
        },
        {
          id: "AwsSolutions-APIG6",
          reason: "Cloudwatch logging out of scope for dummy service",
        },
        {
          id: "AwsSolutions-APIG4",
          reason: "Auth out of scope for dummy service",
        },
        {
          id: "AwsSolutions-COG4",
          reason: "Auth out of scope for dummy service",
        },
      ]);

      Aspects.of(stack).add(new AwsSolutionsChecks());
    });

    describe("AwsSolutions", () => {
      it("should have no unsuppressed warnings", () => {
        const warnings = Annotations.fromStack(stack).findWarning(
          "*",
          Match.stringLikeRegexp("AwsSolutions-.*"),
        );

        expect(warnings).toHaveLength(0);
      });

      it("should have no unsuppressed errors", () => {
        const errors = Annotations.fromStack(stack).findError(
          "*",
          Match.stringLikeRegexp("AwsSolutions-.*"),
        );

        expect(errors).toHaveLength(0);
      });

      it("matches snapshot", () => {
        const template = Template.fromStack(stack);

        expect(template.toJSON()).toMatchSnapshot();
      });
    });
  });
});
