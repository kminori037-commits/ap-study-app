import * as cdk from "aws-cdk-lib/core";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { apiHandlerCode } from "./api-handler";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "ap-study-users",
      featurePlan: cognito.FeaturePlan.LITE,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OFF,
      enableSmsRole: false,
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      userInvitation: {
        emailSubject: "【応用情報 学習室】アカウントのご案内",
        emailBody:
          "応用情報 学習室へ招待されました。ユーザー名は {username}、一時パスワードは {####} です。初回ログイン時に新しいパスワードを設定してください。",
      },
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "ap-study-web",
      generateSecret: false,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
    });

    const questionBank = new dynamodb.Table(this, "QuestionBank", {
      tableName: "ap-study-question-bank",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userLearning = new dynamodb.Table(this, "UserLearning", {
      tableName: "ap-study-user-learning",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "expiresAt",
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const apiFunctionName = "ap-study-api";
    const apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/lambda/${apiFunctionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFunction = new lambda.Function(this, "ApiFunction", {
      functionName: apiFunctionName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromInline(apiHandlerCode),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        USER_LEARNING_TABLE: userLearning.tableName,
        QUESTION_BANK_TABLE: questionBank.tableName,
        QUESTION_BANK_ID: "ORIGINAL_MVP",
      },
      logGroup: apiLogGroup,
    });

    userLearning.grantReadWriteData(apiFunction);
    questionBank.grantReadData(apiFunction);

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    const httpApi = new apigateway.HttpApi(this, "HttpApi", {
      apiName: "ap-study-api",
      corsPreflight: {
        allowOrigins: ["http://localhost:3000"],
        allowHeaders: ["authorization", "content-type"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
      },
    });

    const defaultStage = httpApi.defaultStage?.node.defaultChild as apigateway.CfnStage;
    defaultStage.defaultRouteSettings = {
      throttlingRateLimit: 2,
      throttlingBurstLimit: 5,
    };

    const apiIntegration = new integrations.HttpLambdaIntegration("ApiIntegration", apiFunction);
    const addRoute = (path: string, methods: apigateway.HttpMethod[]) =>
      httpApi.addRoutes({ path, methods, integration: apiIntegration, authorizer: jwtAuthorizer });

    addRoute("/bookmarks", [apigateway.HttpMethod.GET]);
    addRoute("/bookmarks/{questionId}", [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE]);
    addRoute("/history", [apigateway.HttpMethod.GET]);
    addRoute("/history", [apigateway.HttpMethod.DELETE]);
    addRoute("/sessions", [apigateway.HttpMethod.POST]);
    addRoute("/account-data", [apigateway.HttpMethod.DELETE]);
    addRoute("/questions", [apigateway.HttpMethod.GET]);
    addRoute("/questions/{questionId}/grade", [apigateway.HttpMethod.POST]);
    addRoute("/mock/{subject}/active", [apigateway.HttpMethod.GET, apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE]);
    addRoute("/mock/{subject}/start", [apigateway.HttpMethod.POST]);
    addRoute("/mock/{subject}/submit", [apigateway.HttpMethod.POST]);

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito user pool ID for the web application",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito public web client ID",
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Authenticated HTTP API endpoint",
    });
  }
}
