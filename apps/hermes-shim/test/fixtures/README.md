# Fixtures

`hermes-chat-stream.sse` is the **shape** of an OpenAI-style streamed answer with one tool call, written from the OpenAI
streaming format and from what was probed on the real Hermes (0.22.2: `GET /health` answers 200 without a key, `GET /v1/models`
answers 401 without one). **It is not a recording of the real Hermes**, because nobody has supplied its key yet.

To replace it with a real recording, run this on the VPS (or through the tunnel), with the key in the environment only:

```sh
HERMES_API_URL=http://127.0.0.1:8642 HERMES_API_KEY=... node scripts/record-fixture.mjs
```

It sends one harmless question, writes the raw stream to `test/fixtures/recorded/`, and never writes the key. Look through the
file before committing it, then point `shape.test.ts` at it.
