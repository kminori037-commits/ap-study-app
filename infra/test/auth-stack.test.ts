import * as cdk from "aws-cdk-lib/core";
import { Match, Template } from "aws-cdk-lib/assertions";
import { InfraStack } from "../lib/infra-stack";

test("creates an invite-only Lite user pool", () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Cognito::UserPool", {
    UserPoolTier: "LITE",
    AdminCreateUserConfig: Match.objectLike({
      AllowAdminCreateUserOnly: true,
    }),
    UsernameAttributes: ["email"],
    DeletionProtection: "ACTIVE",
    MfaConfiguration: "OFF",
  });

  template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
    ClientName: "ap-study-web",
    GenerateSecret: false,
    PreventUserExistenceErrors: "ENABLED",
  });

  template.resourceCountIs("AWS::DynamoDB::Table", 2);
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
    DeletionProtectionEnabled: true,
  });

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "ap-study-api",
    MemorySize: 128,
    Runtime: "nodejs22.x",
    Timeout: 10,
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
    AuthorizerType: "JWT",
    IdentitySource: ["$request.header.Authorization"],
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: {
      ThrottlingBurstLimit: 5,
      ThrottlingRateLimit: 2,
    },
  });
});
