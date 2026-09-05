import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-600 font-semibold text-white">AP</span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">応用情報 学習室</h1>
          <p className="mt-2 text-sm text-slate-600">招待された方のみログインできます</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
