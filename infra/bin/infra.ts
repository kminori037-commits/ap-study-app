#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();
new InfraStack(app, "ApStudyAuthStack", {
  description: "Invite-only Cognito authentication for AP Study App",
  synthesizer: new cdk.LegacyStackSynthesizer(),
});
