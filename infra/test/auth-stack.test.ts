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
});
