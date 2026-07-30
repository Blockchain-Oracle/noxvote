import hardhatFoundry from "@nomicfoundation/hardhat-foundry";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "hardhat/config";

// nox-hardhat-plugin@0.2.0 passes an explicit two-variable environment to
// docker-compose, which drops PATH and makes `spawn docker` fail on macOS.
// Populate only the runtime variables required to locate the already-running
// Docker installation. This mutates no dependency file and can be removed when
// the released plugin merges process.env itself.
const require = createRequire(import.meta.url);
const noxPluginEntry = require.resolve("@iexec-nox/nox-hardhat-plugin");
const noxConfigUrl = pathToFileURL(
  path.join(path.dirname(noxPluginEntry), "nox-config.js"),
).href;
const { COMPOSE_OPTS } = (await import(noxConfigUrl)) as {
  COMPOSE_OPTS: { env?: NodeJS.ProcessEnv };
};
COMPOSE_OPTS.env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  DOCKER_HOST: process.env.DOCKER_HOST,
  DOCKER_CONTEXT: process.env.DOCKER_CONTEXT,
};

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatFoundry, noxPlugin],
  solidity: {
    version: "0.8.35",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src",
    tests: {
      nodejs: "./test/integration",
    },
  },
  networks: {
    default: {
      type: "edr-simulated",
      chainType: "op",
      chainId: 31337,
    },
  },
});
