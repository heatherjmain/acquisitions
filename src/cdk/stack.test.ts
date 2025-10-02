import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { AcquisitionsStack } from "./stack";

describe("AcquisitionsStack stack", () => {
  let template: Template;

  beforeAll(() => {
    const testStack = new AcquisitionsStack(new App(), "test-stack");
    template = Template.fromStack(testStack);
  });

  it("should create a VPC", () => {
    template.hasResourceProperties("AWS::EC2::VPC", {
      Tags: [
        {
          Value: "test-stack/AcquisitionsVpc",
        },
      ],
    });
  });

  it("should create a DatabaseCluster", () => {
    template.hasResourceProperties("AWS::RDS::DBCluster", {
      DatabaseName: "AcquisitionsDatabaseInstance",
    });
  });

  it("should create a SecurityGroup", () => {
    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupName: "AcquisitionsSecurityGroup",
    });
  });

  it("should create a SubnetGroup", () => {
    template.hasResourceProperties("AWS::RDS::DBSubnetGroup", {
      DBSubnetGroupDescription:
        "Subnets for AcquisitionsDatabaseCluster database",
    });
  });

  it("should create a seedDbLambda with 5 env variables", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "SeedDBLambda",
      Timeout: 900,
      Environment: {
        Variables: {
          DB_HOST: {},
          DB_NAME: "AcquisitionsDatabaseInstance",
          DB_PORT: {},
          DB_SECRET_ARN: {},
          DB_USER: "cred",
        },
      },
    });
  });

  it("should create an acquisitionsGraphQlLambda with 5 env variables", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "AcquisitionsGraphQlLambda",
      Timeout: 30,
      Environment: {
        Variables: {
          DB_HOST: {},
          DB_NAME: "AcquisitionsDatabaseInstance",
          DB_PORT: {},
          DB_SECRET_ARN: {},
          DB_USER: "cred",
        },
      },
    });
  });

  it("should create a API Gateway", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "Acquisitions Service",
    });
  });

  it("should create a API Gateway stage", () => {
    template.hasResourceProperties("AWS::ApiGateway::Stage", {
      StageName: "prod",
    });
  });

  it("should create 2 API Gateway resources for v1 and acquisitions", () => {
    template.hasResourceProperties("AWS::ApiGateway::Resource", {
      PathPart: "v1",
    });
    template.hasResourceProperties("AWS::ApiGateway::Resource", {
      PathPart: "acquisitions",
    });
  });

  it("should create a API Gateway method", () => {
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "POST",
      Integration: {
        IntegrationHttpMethod: "POST",
        Type: "AWS_PROXY",
      },
    });
  });

  it("should generate a secret", () => {
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      GenerateSecretString: {
        SecretStringTemplate: '{"username":"cred"}',
      },
    });
  });
});
