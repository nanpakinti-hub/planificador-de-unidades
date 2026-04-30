export default async function handler(req, res) {
  // Manejo de preflight para evitar bloqueos
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // IMPORTANTE: En Vercel se usa process.env, no import.meta.env
  const nvidiaKey = process.env.VITE_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return res.status(500).json({ error: 'La API KEY no está configurada en Vercel' });
  }

  try {
    const { prompt } = req.body;

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${nvidiaKey}`
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x22b-instruct-v0.1",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    const data = await response.json();
    
    if (data.error) {
        return res.status(500).json({ error: 'Error de NVIDIA: ' + data.error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error de conexión: ' + error.message });
  }
}