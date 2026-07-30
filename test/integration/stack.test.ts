import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";

describe("released local Nox stack", () => {
  it(
    "starts the real local services and etches the released NoxCompute artifact",
    { timeout: 120_000 },
    async () => {
      const connection = await network.getOrCreate();
      const { handleGatewayUrl, noxComputeAddress } =
        await nox.connect(connection);
      const publicClient = await connection.viem.getPublicClient();

      const [gatewayResponse, code] = await Promise.all([
        fetch(handleGatewayUrl),
        publicClient.getCode({ address: noxComputeAddress }),
      ]);

      assert.ok(gatewayResponse.ok);
      assert.ok(code !== undefined && code !== "0x");
    },
  );

  it(
    "imports a real Handle Gateway uint16 proof without putting the choice in calldata",
    { timeout: 120_000 },
    async () => {
      const connection = await network.getOrCreate();
      const { encryptInput } = await nox.connect(connection);
      const probe = await connection.viem.deployContract("NoxInputProbe");

      const { handle, handleProof } = await encryptInput(
        1n,
        "uint16",
        probe.address,
      );

      await probe.write.recordChoice([handle, handleProof]);

      assert.equal(await probe.read.latestChoiceHandle(), handle);
    },
  );
});
