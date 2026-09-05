# AWS infrastructure

AWS CDKで次の2スタックを管理します。

- `ApStudyAuthStack`: Cognito、HTTP API、Lambda、DynamoDB
- `ApStudyHostingStack`: Amplify Hosting、GitHub OIDC、デプロイ専用IAMロール

GitHub ActionsのIAMロールは `kminori037-commits/ap-study-app` の `main` ブランチだけを信頼し、指定したAmplifyアプリへのデプロイ操作だけを許可します。

## 検証

```text
npm ci
npm test -- --runInBand
npm run build
npm run cdk -- synth --quiet
```

AWSリソースを変更する場合は、料金と差分を確認して承認を得てからデプロイします。
