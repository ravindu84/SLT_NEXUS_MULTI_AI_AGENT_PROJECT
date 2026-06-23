export const maxDuration = 60; // Allow up to 60 seconds execution on Vercel

export async function POST(req) {
  try {
    const body = await req.json();
    const backendUrl = "http://16.171.166.199:8000/api/chat_stream";
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Backend proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
