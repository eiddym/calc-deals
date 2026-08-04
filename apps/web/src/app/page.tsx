type DealSession = {
  id: string;
  name: string;
  status: string;
  contractGrossAmount: string | number;
  companyPct: string | number;
  externalPct: string | number;
};

async function getDealSessions(): Promise<DealSession[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  const response = await fetch(`${apiUrl}/deal-sessions`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `No se pudieron cargar las sesiones. HTTP ${response.status}`,
    );
  }

  return response.json();
}

export default async function HomePage() {
  const sessions = await getDealSessions();

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>CALC</h1>
      <p>Sesiones de cálculo financiero</p>

      {sessions.length === 0 ? (
        <p>No hay sesiones registradas.</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id} style={{ marginBottom: '1rem' }}>
              <strong>{session.name}</strong>
              <br />
              Estado: {session.status}
              <br />
              Monto: {session.contractGrossAmount} Bs
              <br />
              Empresa: {session.companyPct}% | Externo:{' '}
              {session.externalPct}%
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
