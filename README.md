# AP Study App

応用情報技術者試験（科目A・科目B）の招待制学習Webアプリです。

## 公開URL

https://main.d3a1gneo3ntdlx.amplifyapp.com/

利用には管理者がAmazon Cognitoから発行した招待アカウントが必要です。一般ユーザーの自己登録はできません。

## 実装済み機能

- 招待制ログイン、初回パスワード変更、本人によるパスワード変更とアカウント削除
- 科目A・科目Bの一問一答と模擬テスト
- 模擬テストの自動保存、中断、再開、時間切れ提出、サーバー採点
- 科目別の履歴、30日・最大50回の保存制限、履歴リセット
- ブックマークの追加・削除
- GitHub Actionsによる検証とAmplify Hostingへの自動デプロイ
- GitHub OIDCによる短期AWS認証（長期アクセスキー不使用）

現在の問題バンクには、春期・秋期を含む約5年分相当として本アプリ独自問題を科目A 800問、科目B 108問収録しています。独自問題には出典を表示せず、外部の問題を追加する場合だけ出典を表示します。一問一答は800問又は108問から重複なしで最大100問、科目A模擬試験は800問から毎回80問をランダム出題します。

## ローカル起動

1. `.env.example` を `.env.local` としてコピーし、開発環境の値を設定します。
2. `npm ci` を実行します。
3. `npm run dev` を実行します。
4. ブラウザーで `http://localhost:3000` を開きます。

## 検証コマンド

```text
npm run lint
npm run validate:questions
npm run build
cd infra
npm ci
npm test -- --runInBand
npm run build
npm run cdk -- synth --quiet
```

`main` ブランチへプッシュすると、同じ検証に合格した場合だけAmplify Hostingへデプロイされます。
