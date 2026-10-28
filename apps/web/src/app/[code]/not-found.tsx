export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div>
        <h1 className="font-serif text-4xl">Link não encontrado</h1>
        <p className="mt-3 text-sm text-muted">
          Verifique o código da plaquinha e tente novamente.
        </p>
      </div>
    </main>
  );
}
