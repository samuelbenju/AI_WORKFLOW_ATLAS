"use client";
export default function AdminError({ reset }: { reset: () => void }) { return <section className="admin-panel admin-empty" lang="es"><h1>No se pudo cargar esta sección</h1><p>Comprueba la conexión e inténtalo de nuevo. No se han sustituido los datos por ejemplos.</p><button className="admin-primary" onClick={reset}>Reintentar</button></section>; }
