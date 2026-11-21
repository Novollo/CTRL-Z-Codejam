# worker/agent: Track D

The seller agent (booklet section 8): one OpenAI call per listing (`AGENT_MODEL` = `gpt-5.4-mini`, JSON mode,
`reasoning_effort: "none"`), the hard limits in 8.5 and the defaults in 8.6. Key: `OPENAI_API_KEY`.

- `index.ts` exports `runSellerAgent` (type in `worker/integrations.ts`). It never throws.
  `agentMode = "default"` or no key → defaults, no call. Timeout `AGENT_TIMEOUT_MS` (5 s) → defaults.
- `checkAgentOutput` applies every check in 8.5. `defaultAgentOutput` is 8.6.
- The system prompt is the 8.4 draft plus the output shape and three short lines (demand = `active_nearby_liking_category`,
  start is normally the food price, one example reason).

## Test (booklet 8.7)

```bash
node worker/agent/run-test.mjs worker/agent/test-agent.ts      # offline rule checks + 20 live runs on the stage order
node worker/agent/run-test.mjs worker/agent/test-agent.ts 0    # offline rule checks only (no OpenAI call)
```

Needs `.dev.vars` (with `OPENAI_API_KEY`) and `npm run db:local`. Each run prints the checked answer, its time,
and which fields the code had to fix.

`run-test.mjs` bundles a test script with esbuild (installed with wrangler) and runs it in Node, with the local D1
database and `.dev.vars` keys from wrangler's `getPlatformProxy` (`test-env.ts`). The Stripe and Telegram tests use it too.
