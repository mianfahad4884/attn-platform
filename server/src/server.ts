import app from './app.js';

const PORT = process.env.PORT || 3001;

async function main() {
  app.listen(PORT, () => {
    console.log(`ATTN API server running on port ${PORT}`);
  });
}

main().catch(console.error);
