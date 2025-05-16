export async function diagnosePod({ pod, namespace, token, apiUrl }: {
    pod: string;
    namespace: string;
    token: string;
    apiUrl: string | undefined;
  }) {
    const res = await fetch(`${apiUrl}/diagnose`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pod, namespace })
    });
  
    if (!res.ok) {
      throw new Error(`Backend returned error ${res.status}: ${await res.text()}`);
    }
  
    return await res.json();
  }
  