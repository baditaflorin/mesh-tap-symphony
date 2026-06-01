import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer test for the advertised core action:
 *
 *   "Each phone is one drum; every tap is appended to a shared
 *    Y.Array<{slot, dt, id}>; the loop replays on every phone."
 *
 * Peer A and peer B join the same room on DIFFERENT drums (snare vs the
 * default kick). Peer A taps its drum pad several times (real clicks on
 * `.tap-stage`). We assert that peer B sees:
 *   - the HUD tap count rise to include peer A's taps, and
 *   - peer A's taps rendered as "other" marks (`.tap-loop-other`) on B's loop
 *     track — i.e. the recorded loop crossed the mesh.
 *
 * This FAILS if `onTap` pushed into a local `useState` array instead of the
 * shared `room.doc.getArray("taps")` — peer B's track and tap count would
 * never reflect peer A's taps.
 */
test("a peer's taps are recorded into the shared loop and appear on the other peer", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Peer A: pick a distinct drum (snare) right on the arm screen so its taps
    // show as "other" marks on peer B's track (B keeps the default kick).
    await a.getByRole("radio", { name: /snare/i }).click();
    await expect(a.getByRole("radio", { name: /snare/i })).toHaveAttribute("aria-checked", "true");

    // Both peers join the band (arms the mesh room + audio).
    await a.getByRole("button", { name: /Join the band/i }).click();
    await b.getByRole("button", { name: /Join the band/i }).click();

    // Pre-condition: peer B's loop has no "other" marks and 0 taps.
    await expect(b.locator(".tap-stage")).toBeVisible();
    await expect(b.locator(".tap-loop-other")).toHaveCount(0);

    // Peer A taps its drum pad several times — real clicks on the tap surface.
    const N = 4;
    for (let i = 0; i < N; i++) {
      await a.locator(".tap-stage").click({ position: { x: 120 + i * 20, y: 200 } });
      await a.waitForTimeout(60);
    }

    // Peer A locally recorded N taps in the shared array.
    await expect(a.locator(".tap-hud")).toHaveText(new RegExp(`${N} taps in loop`));

    // CROSS-PEER ASSERTION: peer B sees peer A's taps in the shared loop.
    // B's drum is kick, A's is snare → A's taps render as ".tap-loop-other".
    await expect(b.locator(".tap-loop-other")).toHaveCount(N, { timeout: 10_000 });
    await expect(b.locator(".tap-hud")).toHaveText(new RegExp(`${N} taps in loop`));

    // Symmetry sanity: peer B taps once on its own drum; peer A sees it as
    // an "other" mark (B's kick ≠ A's snare).
    await b.locator(".tap-stage").click({ position: { x: 200, y: 220 } });
    await expect(a.locator(".tap-hud")).toHaveText(new RegExp(`${N + 1} taps in loop`), {
      timeout: 10_000,
    });
    await expect(a.locator(".tap-loop-other")).toHaveCount(1);
  } finally {
    await cleanup();
  }
});

/**
 * Second core cross-peer interaction: "Clear loop" is shared, not local.
 *
 * `onClear` deletes from the shared `room.doc.getArray("taps")`, so one peer
 * pressing it must wipe the loop on the OTHER peer too. This FAILS if Clear
 * only emptied a local `useState` array — peer B would still hold the taps.
 */
test("clearing the loop on one peer wipes it on the other peer", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByRole("button", { name: /Join the band/i }).click();
    await b.getByRole("button", { name: /Join the band/i }).click();
    await expect(a.locator(".tap-stage")).toBeVisible();
    await expect(b.locator(".tap-stage")).toBeVisible();

    // Peer A records a few taps; both peers' HUDs converge to the same count.
    const N = 3;
    for (let i = 0; i < N; i++) {
      await a.locator(".tap-stage").click({ position: { x: 120 + i * 20, y: 200 } });
      await a.waitForTimeout(60);
    }
    await expect(a.locator(".tap-hud")).toHaveText(new RegExp(`${N} taps in loop`));
    await expect(b.locator(".tap-hud")).toHaveText(new RegExp(`${N} taps in loop`), {
      timeout: 10_000,
    });

    // Peer B clears the shared loop.
    await b.getByRole("button", { name: /Clear loop/i }).click();

    // CROSS-PEER ASSERTION: the loop is now empty on BOTH peers.
    await expect(b.locator(".tap-hud")).toHaveText(/0 taps in loop/, { timeout: 10_000 });
    await expect(a.locator(".tap-hud")).toHaveText(/0 taps in loop/, { timeout: 10_000 });
    await expect(a.locator(".tap-loop-mark")).toHaveCount(0);
  } finally {
    await cleanup();
  }
});
