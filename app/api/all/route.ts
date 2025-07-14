export async function GET() {
  try {
    // Replace with your actual API endpoint
    const response = await fetch("https://amul-notifications.onrender.com/all")
    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
