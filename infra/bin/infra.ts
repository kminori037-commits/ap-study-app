#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { HostingStack } from "../lib/hosting-stack";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();
const hosting = new HostingStack(app, "ApStudyHostingStack", {
  description: "Static Amplify hosting and GitHub OIDC deployment for AP Study App",
  synthesizer: new cdk.LegacyStackSynthesizer(),
});
new InfraStack(app, "ApStudyAuthStack", {
  description: "Invite-only Cognito authentication for AP Study App",
  synthesizer: new cdk.LegacyStackSynthesizer(),
  allowedOrigins: ["http://localhost:3000", hosting.siteUrl],
});
