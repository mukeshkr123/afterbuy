interface Env {
  ASSETS: Fetcher;
  PUBLIC_API_URL: string;
}

export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
