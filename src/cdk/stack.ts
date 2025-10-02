import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  IVpc,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
} from "aws-cdk-lib/aws-rds";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import path from "path";

export class AcquisitionsStack extends Stack {
  public readonly dbHost: string;
  public readonly dbPort: string;
  public readonly dbSecret: ISecret;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // create vpc
    const vpc = new Vpc(this, "AcquisitionsVpc", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "private",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    // create DB cluster
    const dbCluster = new DatabaseCluster(this, "AcquisitionsDatabaseCluster", {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_13_18,
      }),
      credentials: Credentials.fromGeneratedSecret("cred"),
      writer: ClusterInstance.serverlessV2("writer"),
      readers: [],
      vpc: vpc as IVpc,
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      defaultDatabaseName: "AcquisitionsDatabaseInstance",
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    this.dbHost = dbCluster.clusterEndpoint.hostname;
    this.dbPort = dbCluster.clusterEndpoint.port.toString();
    this.dbSecret = dbCluster.secret!;

    // create security group
    const lambdaSG = new SecurityGroup(this, "LambdaSG", {
      securityGroupName: "AcquisitionsSecurityGroup",
      vpc: vpc as IVpc,
      allowAllOutbound: true,
    });

    const rdsSG = dbCluster.connections.securityGroups[0];
    rdsSG!.addIngressRule(
      lambdaSG,
      Port.tcp(5432),
      "Allow Lambda to talk to RDS",
    );

    // create lambdas
    const commonLambdaConfig = {
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      memorySize: 1024,
      vpc: vpc as IVpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        DB_HOST: this.dbHost,
        DB_PORT: this.dbPort,
        DB_USER: "cred",
        DB_SECRET_ARN: this.dbSecret.secretArn,
        DB_NAME: "AcquisitionsDatabaseInstance",
        DEBUG_SQL: "0",
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "gpt-4o",
      },
      securityGroups: [lambdaSG],
    };

    const seedDbLambda = new NodejsFunction(this, "SeedDbFunction", {
      ...commonLambdaConfig,
      functionName: "SeedDBLambda",
      entry: "./src/db/seed-db-lambda.ts",
      bundling: {
        nodeModules: ["csv-parse"],
        commandHooks: {
          beforeBundling(): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // copy the CSV into the Lambda bundle
            return [
              `mkdir -p ${outputDir}/data`,
              `cp ${path.join(inputDir, "../acquisitions/src/db/data/acquisitions-data.csv")} ${outputDir}/data/acquisitions-data.csv`,
              `cp ${path.join(inputDir, "../acquisitions/src/db/data/companies-data.csv")} ${outputDir}/data/companies-data.csv`,
            ];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
      },
      timeout: Duration.minutes(15),
    });
    seedDbLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [this.dbSecret.secretArn],
      }),
    );

    const acquisitionsGraphqlLambda = new NodejsFunction(
      this,
      "AcquisitionsGraphqlLambda",
      {
        ...commonLambdaConfig,
        entry: "./src/graphql/graphql-lambda.ts",
        timeout: Duration.seconds(30),
        functionName: "AcquisitionsGraphQlLambda",
      },
    );
    acquisitionsGraphqlLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [this.dbSecret.secretArn],
      }),
    );

    const acquisitionsLlmLambda = new NodejsFunction(
      this,
      "AcquisitionsLlmLambda",
      {
        ...commonLambdaConfig,
        entry: "./src/llm/llm-lambda.ts",
        timeout: Duration.seconds(30),
        functionName: "AcquisitionsLlmLambda",
      },
    );
    acquisitionsLlmLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [this.dbSecret.secretArn],
      }),
    );

    // create API gateway
    const acquisitionsApiGateway = new RestApi(this, "AcquisitionsApiGateway", {
      restApiName: "Acquisitions Service",
      description: "Exposes query Lambda via API Gateway",
    });

    const v1 = acquisitionsApiGateway.root.addResource("v1");

    v1.addResource("acquisitions").addMethod(
      "POST",
      new LambdaIntegration(acquisitionsGraphqlLambda),
    );

    v1.addResource("llm")
      .addResource("acquisitions")
      .addMethod("POST", new LambdaIntegration(acquisitionsLlmLambda));
  }
}
