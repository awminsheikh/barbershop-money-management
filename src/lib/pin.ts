export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(`barbershop:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
