export default {
  async fetch(request, env, ctx) {
    return new Response("CAB Bhilai Airport admin deployment", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }
};