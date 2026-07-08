import app from './app.js';
import { initStore } from './models/store.js';

const PORT = process.env.PORT || 3001;

async function main() {
  await initStore(); // Hash seed passwords with argon2
  app.listen(PORT, () => {
    console.log(`ATTN API server running on port ${PORT}`);
  });
}

main().catch(console.error);
