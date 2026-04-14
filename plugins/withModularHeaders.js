const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      const contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes("use_modular_headers!")) {
        fs.writeFileSync(
          podfilePath,
          contents.replace(
            "platform :ios,",
            "use_modular_headers!\nplatform :ios,"
          )
        );
      }

      return config;
    },
  ]);
};

module.exports = withModularHeaders;
