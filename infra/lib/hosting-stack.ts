import * as cdk from "aws-cdk-lib/core";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

const githubRepositorySubject = "repo:kminori037-commits@261311293/ap-study-app@1358167591:ref:refs/heads/main";
const productionBranch = "main";

export class HostingStack extends cdk.Stack {
  readonly siteUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const app = new amplify.CfnApp(this, "HostingApp", {
      name: "ap-study-app",
      description: "Invite-only AP Study App static frontend",
      platform: "WEB",
      customHeaders: `customHeaders:
  - pattern: "**/*"
    headers:
      - key: Strict-Transport-Security
        value: "max-age=31536000; includeSubDomains"
      - key: X-Content-Type-Options
        value: "nosniff"
      - key: Referrer-Policy
        value: "strict-origin-when-cross-origin"`,
    });

    const branch = new amplify.CfnBranch(this, "ProductionBranch", {
      appId: app.attrAppId,
      branchName: productionBranch,
      description: "Production deployment from GitHub Actions",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    const githubProvider = new iam.CfnOIDCProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIdList: ["sts.amazonaws.com"],
    });

    const deployRole = new iam.Role(this, "GitHubDeployRole", {
      roleName: "ap-study-github-deploy",
      description: "Short-lived role used only by the AP Study App main-branch deployment workflow",
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.attrArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": githubRepositorySubject,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    const appArn = cdk.Stack.of(this).formatArn({
      service: "amplify",
      resource: "apps",
      resourceName: app.attrAppId,
    });
    deployRole.addToPolicy(new iam.PolicyStatement({
      actions: ["amplify:CreateDeployment", "amplify:StartDeployment", "amplify:GetJob"],
      resources: [appArn, `${appArn}/branches/${productionBranch}`, `${appArn}/branches/${productionBranch}/jobs/*`],
    }));

    this.siteUrl = `https://${productionBranch}.${app.attrDefaultDomain}`;

    new cdk.CfnOutput(this, "AmplifyAppId", {
      value: app.attrAppId,
      description: "Amplify Hosting application ID",
    });
    new cdk.CfnOutput(this, "SiteUrl", {
      value: this.siteUrl,
      description: "Production application URL",
    });
    new cdk.CfnOutput(this, "GitHubDeployRoleArn", {
      value: deployRole.roleArn,
      description: "Least-privilege role assumed by GitHub Actions through OIDC",
    });

    branch.addResourceDependency(app);
  }
}
