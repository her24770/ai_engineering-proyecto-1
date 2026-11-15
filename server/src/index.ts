import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig(process.env);
const server = createApp(config);

server.listen(config.port, () => {
  console.log(`agichat-server escuchando en :${config.port}`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
