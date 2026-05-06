const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const androidAssetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );

      if (!fs.existsSync(androidAssetsDir)) {
        fs.mkdirSync(androidAssetsDir, { recursive: true });
      }

      const src = path.join(
        config.modRequest.projectRoot,
        "assets",
        "adi-registration.properties"
      );
      const dest = path.join(androidAssetsDir, "adi-registration.properties");

      fs.copyFileSync(src, dest);

      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
