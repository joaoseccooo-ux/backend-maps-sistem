export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/";
  const error = searchParams.error;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        method="POST"
        action="/api/login"
        className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Buscador de Leads</h1>
          <p className="text-sm text-muted-foreground">Digite a senha para continuar</p>
        </div>

        <input type="hidden" name="next" value={next} />

        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Senha"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {error === "senha" && (
          <p className="text-sm text-destructive">Senha incorreta.</p>
        )}
        {error === "config" && (
          <p className="text-sm text-destructive">
            APP_PASSWORD não está configurada no ambiente.
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
