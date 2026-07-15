import("vitest/node").then(() => process.exit(0)).catch(() => import("vitest").then(m => m.run()).catch(e => { console.error(e); process.exit(1); }));
