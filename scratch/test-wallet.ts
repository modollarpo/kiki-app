import { topUpWallet, getWalletBalance } from "../src/lib/wallet";
import { getDb } from "../src/lib/db";

async function run() {
  const db = await getDb();
  
  // Clean up previous test wallets
  await db.prepare("DELETE FROM wallets WHERE tenant_id = 'test_tenant'").run();

  console.log("=== STARTING WALLET TOP-UP TEST ===");

  const initialBalance = await getWalletBalance("test_tenant");
  console.log(`Initial Balance: $${initialBalance.balance}`);

  console.log("\nSimulating Top-Up of $500...");
  
  // Since we don't have STRIPE_SECRET_KEY set in our process.env here,
  // this should fall back to Mock Mode and instantly credit.
  const result = await topUpWallet("test_tenant", 500, "card", "Test Top-Up");
  console.log(result);

  const newBalance = await getWalletBalance("test_tenant");
  console.log(`\nNew Balance: $${newBalance.balance}`);

  if (newBalance.balance === 500 && result.success) {
    console.log("✅ Mock Wallet Top-Up Successful!");
  } else {
    console.error("❌ Wallet Top-Up Failed!");
  }
}

run().catch(console.error);
