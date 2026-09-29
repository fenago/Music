// Every Suno API task requires a callBackUrl. SongForge polls for results instead,
// so this endpoint only acknowledges the callback and discards the payload.
export default async () =>
  new Response(JSON.stringify({ code: 200, msg: "received" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
