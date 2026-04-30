const { expo } = require('./app.json');
const { version } = require('./package.json');

module.exports = {
  expo: {
    ...expo,
    version,
    ios: {
      ...expo.ios,
      googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? expo.ios.googleServicesFile,
    },
    android: {
      ...expo.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile,
    },
  },
};
