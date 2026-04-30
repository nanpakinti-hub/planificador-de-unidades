export default async function handler(req, res) {
  // 1. Aceptar la petición solo si es POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 2. Extraer el prompt que nos envía React y la clave segura de Vercel
  const { prompt } = req.body;
  const nvidiaKey = process.env.VITE_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return res.status(500).json({ error: 'Falta la API Key en el servidor' });
  }

  try {
    // 3. Hacer la llamada a NVIDIA desde el servidor (donde CORS no existe)
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
    
    // 4. Devolver la respuesta de NVIDIA a nuestro frontend de React
    res.status(200).json(data);
  } catch (error) {
    console.error("Error en el backend:", error);
    res.status(500).json({ error: 'Falló la conexión con NVIDIA' });
  }
}