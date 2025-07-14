export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Replace with your actual API endpoint
    const response = await fetch("https://amul-notifications.onrender.com/notify", {
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
    return new Response("Failed to subscribe to notifications", { status: 500 })
  }
}
