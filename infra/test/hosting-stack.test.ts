import * as cdk from "aws-cdk-lib/core";
import { Match, Template } from "aws-cdk-lib/assertions";
import { HostingStack } from "../lib/hosting-stack";

test("creates static Amplify hosting with a main-only GitHub OIDC role", () => {
  const app = new cdk.App();
  const stack = new HostingStack(app, "TestHostingStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Amplify::App", {
    Name: "ap-study-app",
    Platform: "WEB",
  });
  template.hasResourceProperties("AWS::Amplify::Branch", {
    BranchName: "main",
    EnableAutoBuild: false,
    Stage: "PRODUCTION",
  });
  template.hasResourceProperties("AWS::IAM::OIDCProvider", {
    Url: "https://token.actions.githubusercontent.com",
    ClientIdList: ["sts.amazonaws.com"],
  });
  template.hasResourceProperties("AWS::IAM::Role", {
    RoleName: "ap-study-github-deploy",
    AssumeRolePolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({
          Condition: {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              "token.actions.githubusercontent.com:sub": "repo:kminori037-commits@261311293/ap-study-app@1358167591:ref:refs/heads/main",
            },
          },
        }),
      ]),
    }),
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: ["amplify:CreateDeployment", "amplify:StartDeployment", "amplify:GetJob"],
        }),
      ]),
    }),
  });
});
