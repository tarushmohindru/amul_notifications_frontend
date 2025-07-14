export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Replace with your actual API endpoint
    const response = await fetch("http://localhost:5000/notify/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText, { status: response.status })
    }

    return new Response("", { status: 200 })
  } catch (error) {
    return new Response("Failed to unsubscribe from notifications", { status: 500 })
  }
}
