import { createApp } from "./app.mjs";
const { app, close } = createApp();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(
    `Meda server listening on ${host}:${port}. Fictional-data development use only.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
