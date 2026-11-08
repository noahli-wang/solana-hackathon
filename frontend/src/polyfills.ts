
import { Buffer } from "buffer";

// Make Buffer available to Solana and Anchor libraries in the browser.
Object.assign(globalThis, { Buffer });
