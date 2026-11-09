export default function Loading() {
  return (
    <div className="space-y-6 p-8" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
        <div className="skeleton hidden h-96 rounded-2xl xl:block" />
      </div>
    </div>
  );
}
